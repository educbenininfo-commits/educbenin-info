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
import { PATCH } from './route';
import { seedAdmin, seedSuperadmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const mockVerifyCsrf = vi.mocked(verifyCsrf);
const mockLogAdminAction = vi.mocked(logAdminAction);

const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};
const superadminUser = seedSuperadmin({ id: 'superadmin_1', email: 'superadmin@test.local' });
const superadminCtx = {
  user: { sub: superadminUser.id, email: superadminUser.email },
  admin: { id: superadminUser.id, email: superadminUser.email, role: 'SUPERADMIN' as const },
};

function paramsOf(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}
function makeReq(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://test/api/admin/users/${id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
  mockVerifyCsrf.mockReturnValue(null);
  prismaMock.$transaction.mockImplementation((cb: unknown) => {
    if (typeof cb === 'function') {
      return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    }
    return Promise.resolve(cb);
  });
});

describe('PATCH /api/admin/users/[id]/status', () => {
  it('requires ADMIN', async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await PATCH(makeReq('u1', { status: 'SUSPENDED' }), paramsOf('u1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when the target does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq('missing', { status: 'SUSPENDED' }), paramsOf('missing'));
    expect(res.status).toBe(404);
  });

  it('is idempotent when the status is unchanged — no AdminAction is written', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      status: 'ACTIVE',
      email: 'agent@test.local',
      name: null,
      role: 'USER',
    } as never);

    const res = await PATCH(makeReq('u1', { status: 'ACTIVE' }), paramsOf('u1'));

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it('requires SUPERADMIN to restore a suspended account', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      status: 'SUSPENDED',
      email: 'agent@test.local',
      name: null,
      role: 'USER',
    } as never);

    const res = await PATCH(makeReq('u1', { status: 'ACTIVE' }), paramsOf('u1'));

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('RESTORE_REQUIRES_SUPERADMIN');
  });

  it('requires SUPERADMIN to suspend a SUPERADMIN target', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      status: 'ACTIVE',
      email: 'other-superadmin@test.local',
      name: null,
      role: 'SUPERADMIN',
    } as never);

    const res = await PATCH(makeReq('u1', { status: 'SUSPENDED' }), paramsOf('u1'));

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('SUSPEND_REQUIRES_SUPERADMIN');
  });

  it('refuses to suspend the protected founder account, even for a SUPERADMIN actor', async () => {
    mockRequireAdmin.mockResolvedValueOnce(superadminCtx);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      status: 'ACTIVE',
      email: 'lissanonpren@gmail.com',
      name: 'Horace',
      role: 'SUPERADMIN',
    } as never);

    const res = await PATCH(makeReq('u1', { status: 'SUSPENDED' }), paramsOf('u1'));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('PROTECTED_ACCOUNT');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('suspends a plain USER and logs user.suspend', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      status: 'ACTIVE',
      email: 'agent@test.local',
      name: null,
      role: 'USER',
    } as never);
    prismaMock.user.update.mockResolvedValueOnce({ id: 'u1', status: 'SUSPENDED' } as never);

    const res = await PATCH(makeReq('u1', { status: 'SUSPENDED' }), paramsOf('u1'));

    expect(res.status).toBe(200);
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.suspend',
        metadata: { from: 'ACTIVE', to: 'SUSPENDED' },
      }),
    );
  });

  it('a SUPERADMIN actor can restore a suspended account and logs user.restore', async () => {
    mockRequireAdmin.mockResolvedValueOnce(superadminCtx);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      status: 'SUSPENDED',
      email: 'agent@test.local',
      name: null,
      role: 'USER',
    } as never);
    prismaMock.user.update.mockResolvedValueOnce({ id: 'u1', status: 'ACTIVE' } as never);

    const res = await PATCH(makeReq('u1', { status: 'ACTIVE' }), paramsOf('u1'));

    expect(res.status).toBe(200);
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'user.restore' }),
    );
  });
});
