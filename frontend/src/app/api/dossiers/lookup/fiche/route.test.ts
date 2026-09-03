import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/upload/uploadPublicFile', () => ({
  uploadPublicFile: vi.fn(),
}));

import { POST } from './route';
import { uploadPublicFile } from '@/lib/server/upload/uploadPublicFile';

const mockUploadPublicFile = vi.mocked(uploadPublicFile);

function pdfFile(): File {
  return new File([Buffer.from('%PDF-1.4')], 'fiche.pdf', { type: 'application/pdf' });
}

function makeReq(overrides: Record<string, string | File> = {}): NextRequest {
  const fd = new FormData();
  const base: Record<string, string | File> = {
    reference: 'EB-202609-001',
    whatsapp: '+229 97 00 00 00',
    file: pdfFile(),
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) fd.append(k, v);
  return new NextRequest('http://test/api/dossiers/lookup/fiche', { method: 'POST', body: fd });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUploadPublicFile.mockResolvedValue({
    ok: true,
    url: 'https://res.cloudinary.com/demo/raw/upload/dossiers/EB-202609-001/fiche-inscription',
    bytes: 500,
  });
});

describe('POST /api/dossiers/lookup/fiche', () => {
  it('uploads the fiche and sets ficheUploaded/ficheUrl when stage === 3', async () => {
    prismaMock.dossier.findFirst.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 3,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({} as never);

    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'dos_1' },
      data: {
        ficheUploaded: true,
        ficheUrl:
          'https://res.cloudinary.com/demo/raw/upload/dossiers/EB-202609-001/fiche-inscription',
      },
    });
  });

  it('returns generic 404 when reference+whatsapp do not match', async () => {
    prismaMock.dossier.findFirst.mockResolvedValueOnce(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it('returns 409 WRONG_STAGE outside stage 3', async () => {
    prismaMock.dossier.findFirst.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 2,
    } as never);
    const res = await POST(makeReq());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('WRONG_STAGE');
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });

  it('returns 400 when the file is missing', async () => {
    const fd_ = makeReq();
    const res = await POST(
      new NextRequest('http://test/x', { method: 'POST', body: await stripFile(fd_) }),
    );
    expect(res.status).toBe(400);
  });
});

// Helper — clone a request's FormData without the `file` field.
async function stripFile(req: NextRequest): Promise<FormData> {
  const original = await req.formData();
  const fd = new FormData();
  for (const [k, v] of original.entries()) {
    if (k !== 'file') fd.append(k, v);
  }
  return fd;
}
