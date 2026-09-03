// frontend/src/app/api/admin/dossiers/[id]/route.test.ts
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
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
import { GET, PATCH } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockVerifyCsrf = vi.mocked(verifyCsrf);
const mockLogAdminAction = vi.mocked(logAdminAction);

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
  mockVerifyCsrf.mockReturnValue(null);
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

function makePatchReq(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/dossiers/[id]', () => {
  it('updates paye and moyen, clamping paye to montant when montant is unchanged', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      montant: 50000,
      montantSupplement: null,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({ id: 'd1', paye: 50000 } as never);

    const res = await PATCH(
      makePatchReq('d1', { paye: 999999, moyen: 'Mobile Money' }),
      paramsOf('d1'),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { paye: 50000, moyen: 'Mobile Money' },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'dossier.payment_update',
        targetType: 'Dossier',
        targetId: 'd1',
      }),
    );
  });

  it('clamps paye against montant + montantSupplement when both are set in the same request', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      montant: 50000,
      montantSupplement: null,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({} as never);

    await PATCH(
      makePatchReq('d1', { montant: 50000, montantSupplement: 50000, paye: 80000 }),
      paramsOf('d1'),
    );

    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { montant: 50000, montantSupplement: 50000, paye: 80000 },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
  });

  it('clamps a negative paye to 0', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      montant: 50000,
      montantSupplement: null,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({} as never);

    await PATCH(makePatchReq('d1', { paye: -100 }), paramsOf('d1'));

    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { paye: 0 },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
  });

  it('returns 404 DOSSIER_NOT_FOUND when the id does not exist', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makePatchReq('missing', { paye: 1000 }), paramsOf('missing'));
    expect(res.status).toBe(404);
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it('rejects when CSRF fails — short-circuits before requireAdmin', async () => {
    mockVerifyCsrf.mockReturnValueOnce(
      NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }),
    );
    const res = await PATCH(makePatchReq('d1', { paye: 1000 }), paramsOf('d1'));
    expect(res.status).toBe(403);
    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });

  it('rejects an unknown moyen value with 400 VALIDATION_FAILED', async () => {
    const res = await PATCH(makePatchReq('d1', { moyen: 'Chèque' }), paramsOf('d1'));
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.findUnique).not.toHaveBeenCalled();
  });
});
