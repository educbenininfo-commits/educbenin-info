// frontend/src/app/api/admin/dossiers/[id]/recepisse/route.test.ts
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({ enforceAdminRateLimit: vi.fn() }));
vi.mock('@/lib/server/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth');
  return { ...actual, verifyCsrf: vi.fn() };
});
vi.mock('@/lib/server/admin/audit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server/upload/uploadPublicFile', () => ({ uploadPublicFile: vi.fn() }));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { uploadPublicFile } from '@/lib/server/upload/uploadPublicFile';
import { POST } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const mockVerifyCsrf = vi.mocked(verifyCsrf);
const mockLogAdminAction = vi.mocked(logAdminAction);
const mockUploadPublicFile = vi.mocked(uploadPublicFile);
const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function pdfFile(): File {
  return new File([Buffer.from('%PDF-1.4')], 'recepisse.pdf', { type: 'application/pdf' });
}
function makeReq(id: string, file: File | null = pdfFile()): NextRequest {
  const fd = new FormData();
  if (file) fd.append('file', file);
  return new NextRequest(`http://test/api/admin/dossiers/${id}/recepisse`, {
    method: 'POST',
    body: fd,
  });
}
function paramsOf(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
  mockVerifyCsrf.mockReturnValue(null);
  mockUploadPublicFile.mockResolvedValue({
    ok: true,
    path: 'dossiers/EB-202609-001/recepisse',
    bytes: 900,
  });
});

describe('POST /api/admin/dossiers/[id]/recepisse', () => {
  it('uploads and sets recepisseUploaded/Url at stage 4', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage: 4,
      recepisseUploaded: false,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({ id: 'd1' } as never);

    const res = await POST(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(200);
    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: {
        recepisseUploaded: true,
        recepisseUrl: 'dossiers/EB-202609-001/recepisse',
      },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'dossier.recepisse_upload',
        targetType: 'Dossier',
        targetId: 'd1',
      }),
    );
  });

  it('allows upload at stage 5 only when not already uploaded', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage: 5,
      recepisseUploaded: false,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({ id: 'd1' } as never);

    const res = await POST(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(200);
  });

  it('returns 409 WRONG_STAGE at stage 5 when already uploaded', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage: 5,
      recepisseUploaded: true,
    } as never);
    const res = await POST(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(409);
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it.each([1, 2, 3])('returns 409 WRONG_STAGE at stage %d', async (stage) => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage,
      recepisseUploaded: false,
    } as never);
    const res = await POST(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(409);
  });

  it('returns 400 VALIDATION_FAILED when no file is attached', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage: 4,
      recepisseUploaded: false,
    } as never);
    const res = await POST(makeReq('d1', null), paramsOf('d1'));
    expect(res.status).toBe(400);
    expect(mockUploadPublicFile).not.toHaveBeenCalled();
  });
});
