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

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { POST } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const mockVerifyCsrf = vi.mocked(verifyCsrf);
const mockLogAdminAction = vi.mocked(logAdminAction);
const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makeReq(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}/reject`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
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
});

describe('POST /api/admin/dossiers/[id]/reject', () => {
  it('sets stage=0, stores the motif, and stamps stageChangedAt for a stage 1-4 dossier', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage: 2,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({ id: 'd1', stage: 0 } as never);

    const res = await POST(makeReq('d1', { motif: 'Pièces manquantes' }), paramsOf('d1'));
    expect(res.status).toBe(200);
    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: expect.objectContaining({ stage: 0, motifRejet: 'Pièces manquantes' }),
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'dossier.reject', targetType: 'Dossier', targetId: 'd1' }),
    );
  });

  it.each([0, 5])('returns 409 WRONG_STAGE when the dossier is at stage %d', async (stage) => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage,
    } as never);
    const res = await POST(makeReq('d1', { motif: 'x' }), paramsOf('d1'));
    expect(res.status).toBe(409);
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_FAILED for an empty motif', async () => {
    const res = await POST(makeReq('d1', { motif: '' }), paramsOf('d1'));
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 DOSSIER_NOT_FOUND for an unknown id', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeReq('missing', { motif: 'x' }), paramsOf('missing'));
    expect(res.status).toBe(404);
  });
});
