// frontend/src/app/api/admin/dossiers/[id]/route.test.ts
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { GET } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makeReq(id: string): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}`, { method: 'GET' });
}
function paramsOf(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
});

describe('GET /api/admin/dossiers/[id]', () => {
  it('returns the full dossier with comments ordered oldest-first', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      comments: [{ id: 'c1', type: 'public', text: 'hi', authorName: 'a@test.local' }],
    } as never);

    const res = await GET(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { dossier: { id: string } };
    expect(body.dossier.id).toBe('d1');

    expect(prismaMock.dossier.findUnique).toHaveBeenCalledWith({
      where: { id: 'd1' },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
  });

  it('returns 404 DOSSIER_NOT_FOUND when the id does not exist', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeReq('missing'), paramsOf('missing'));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('DOSSIER_NOT_FOUND');
  });

  it('propagates 403 from requireAdmin', async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(403);
    expect(prismaMock.dossier.findUnique).not.toHaveBeenCalled();
  });
});
