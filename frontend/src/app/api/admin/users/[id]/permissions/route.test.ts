import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireSuperadmin: vi.fn() }));
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

import { requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { PATCH } from './route';
import { seedSuperadmin } from '@/test-utils/admin-fixtures';

const mockRequireSuperadmin = vi.mocked(requireSuperadmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const mockVerifyCsrf = vi.mocked(verifyCsrf);
const mockLogAdminAction = vi.mocked(logAdminAction);

const superadminUser = seedSuperadmin({ id: 'superadmin_1', email: 'superadmin@test.local' });
const superadminCtx = {
  user: { sub: superadminUser.id, email: superadminUser.email },
  admin: { id: superadminUser.id, email: superadminUser.email, role: 'SUPERADMIN' as const },
};

const perms = {
  dossiers: 'manage',
  dossiersRejetes: 'read',
  specialites: 'none',
  tarifs: 'none',
  comptesAdmin: 'none',
};

function paramsOf(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}
function makeReq(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://test/api/admin/users/${id}/permissions`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSuperadmin.mockResolvedValue(superadminCtx);
  mockRateLimit.mockResolvedValue(null);
  mockVerifyCsrf.mockReturnValue(null);
  prismaMock.$transaction.mockImplementation((cb: unknown) => {
    if (typeof cb === 'function') {
      return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    }
    return Promise.resolve(cb);
  });
});

describe('PATCH /api/admin/users/[id]/permissions', () => {
  it('requires SUPERADMIN', async () => {
    mockRequireSuperadmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await PATCH(makeReq('u1', { modulePermissions: perms }), paramsOf('u1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when the target does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq('missing', { modulePermissions: perms }), paramsOf('missing'));
    expect(res.status).toBe(404);
  });

  it('returns 409 NOT_APPLICABLE for a SUPERADMIN target', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: 'SUPERADMIN',
      modulePermissions: null,
      adminLabel: null,
    } as never);
    const res = await PATCH(makeReq('u1', { modulePermissions: perms }), paramsOf('u1'));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('NOT_APPLICABLE');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('updates modulePermissions + adminLabel for an ADMIN target and logs a before/after diff', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: 'ADMIN',
      modulePermissions: null,
      adminLabel: null,
    } as never);
    prismaMock.user.update.mockResolvedValueOnce({
      id: 'u1',
      adminLabel: 'SUPPORT',
      modulePermissions: perms,
    } as never);

    const res = await PATCH(
      makeReq('u1', { adminLabel: 'SUPPORT', modulePermissions: perms }),
      paramsOf('u1'),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { adminLabel: 'SUPPORT', modulePermissions: perms },
      select: { id: true, adminLabel: true, modulePermissions: true },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.permissions_change',
        targetType: 'User',
        targetId: 'u1',
      }),
    );
  });

  it('rejects an invalid permission level with 400 VALIDATION_FAILED', async () => {
    const res = await PATCH(
      makeReq('u1', { modulePermissions: { ...perms, dossiers: 'superpower' } }),
      paramsOf('u1'),
    );
    expect(res.status).toBe(400);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
