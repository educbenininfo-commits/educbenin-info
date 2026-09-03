// frontend/src/app/api/admin/dossiers/[id]/restore/route.test.ts
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

function makeReq(id: string): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}/restore`, { method: 'POST' });
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

describe('POST /api/admin/dossiers/[id]/restore', () => {
  it('restores a stage-0 dossier to stage 1 and stamps stageChangedAt', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage: 0,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({ id: 'd1', stage: 1 } as never);

    const res = await POST(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(200);
    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: expect.objectContaining({ stage: 1 }),
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'dossier.restore', targetType: 'Dossier', targetId: 'd1' }),
    );
  });

  it.each([1, 2, 3, 4, 5])(
    'returns 409 WRONG_STAGE for a non-rejected dossier at stage %d',
    async (stage) => {
      prismaMock.dossier.findUnique.mockResolvedValueOnce({
        id: 'd1',
        reference: 'EB-202609-001',
        stage,
      } as never);
      const res = await POST(makeReq('d1'), paramsOf('d1'));
      expect(res.status).toBe(409);
      expect(prismaMock.dossier.update).not.toHaveBeenCalled();
    },
  );

  it('returns 404 DOSSIER_NOT_FOUND for an unknown id', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeReq('missing'), paramsOf('missing'));
    expect(res.status).toBe(404);
  });
});
