import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/dossiers/reference', () => ({
  generateReference: vi.fn().mockResolvedValue('EB-202609-001'),
}));
vi.mock('@/lib/server/upload/uploadPublicFile', () => ({
  uploadPublicFile: vi.fn(),
}));

import { POST } from './route';
import { generateReference } from '@/lib/server/dossiers/reference';
import { uploadPublicFile } from '@/lib/server/upload/uploadPublicFile';

const mockUploadPublicFile = vi.mocked(uploadPublicFile);

function pdfFile(): File {
  return new File([Buffer.from('%PDF-1.4')], 'dossier.pdf', { type: 'application/pdf' });
}

function makeForm(overrides: Record<string, string | File | string[]> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string | File | string[]> = {
    nom: 'AMOUSSOU',
    prenom: 'Koffi',
    whatsapp: '+229 97 00 00 00',
    specialtyCodes: ['PED'],
    consent1: 'true',
    consent2: 'true',
    consent3: 'true',
    consent4: 'true',
    pdf: pdfFile(),
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.append(key, value);
    }
  }
  return fd;
}

function makeReq(form: FormData): NextRequest {
  return new NextRequest('http://test/api/dossiers', { method: 'POST', body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(generateReference).mockResolvedValue('EB-202609-001');
  prismaMock.$transaction.mockImplementation((cb: unknown) => {
    if (typeof cb === 'function') {
      return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    }
    return Promise.resolve(cb);
  });
  mockUploadPublicFile.mockResolvedValue({
    ok: true,
    url: 'https://res.cloudinary.com/demo/raw/upload/dossiers/EB-202609-001/piece-jointe',
    bytes: 1234,
  });
});

describe('POST /api/dossiers', () => {
  it('creates a dossier, uploads the PDF, and returns the reference', async () => {
    prismaMock.dossier.create.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({} as never);

    const res = await POST(makeReq(makeForm()));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ reference: 'EB-202609-001' });

    expect(prismaMock.dossier.create).toHaveBeenCalledWith({
      data: {
        reference: 'EB-202609-001',
        nom: 'AMOUSSOU',
        prenom: 'Koffi',
        whatsapp: '+229 97 00 00 00',
        specialtyCodes: ['PED'],
      },
    });
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.any(File),
      'dossiers/EB-202609-001/piece-jointe',
    );
    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'dos_1' },
      data: {
        pieceJointeUrl:
          'https://res.cloudinary.com/demo/raw/upload/dossiers/EB-202609-001/piece-jointe',
      },
    });
  });

  it('rejects an invalid WhatsApp format with 400 VALIDATION_FAILED', async () => {
    const res = await POST(makeReq(makeForm({ whatsapp: '0197000000' })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('VALIDATION_FAILED');
    expect(prismaMock.dossier.create).not.toHaveBeenCalled();
  });

  it('rejects when a consent box is missing', async () => {
    const res = await POST(makeReq(makeForm({ consent3: 'false' })));
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown specialty code', async () => {
    const res = await POST(makeReq(makeForm({ specialtyCodes: ['XXX'] })));
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.create).not.toHaveBeenCalled();
  });

  it('rejects a request with no PDF attached', async () => {
    const fd = makeForm();
    fd.delete('pdf');
    const res = await POST(makeReq(fd));
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.create).not.toHaveBeenCalled();
  });

  it('propagates the upload helper error status/code', async () => {
    prismaMock.dossier.create.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
    } as never);
    mockUploadPublicFile.mockResolvedValueOnce({
      ok: false,
      error: { code: 'STORAGE_NOT_CONFIGURED', status: 503 },
    });

    const res = await POST(makeReq(makeForm()));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('STORAGE_NOT_CONFIGURED');
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });
});
