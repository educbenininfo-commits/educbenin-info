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

function paramsOf(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}
function makeReq(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://test/api/admin/users/${id}/role`, {
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

describe('PATCH /api/admin/users/[id]/role', () => {
  it('requires SUPERADMIN', async () => {
    mockRequireSuperadmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await PATCH(makeReq('u1', { role: 'ADMIN' }), paramsOf('u1'));
    expect(res.status).toBe(403);
  });

  it('rejects when CSRF fails', async () => {
    mockVerifyCsrf.mockReturnValueOnce(
      NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }),
    );
    const res = await PATCH(makeReq('u1', { role: 'ADMIN' }), paramsOf('u1'));
    expect(res.status).toBe(403);
    expect(mockRequireSuperadmin).not.toHaveBeenCalled();
  });

  it('returns 404 when the target does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq('missing', { role: 'ADMIN' }), paramsOf('missing'));
    expect(res.status).toBe(404);
  });

  it('refuses to demote the last SUPERADMIN', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: 'SUPERADMIN',
      email: 'a@test.local',
    } as never);
    prismaMock.user.count.mockResolvedValueOnce(1);

    const res = await PATCH(makeReq('u1', { role: 'ADMIN' }), paramsOf('u1'));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('LAST_SUPERADMIN');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('refuses to demote the protected founder account, even when other SUPERADMINs exist', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: 'SUPERADMIN',
      email: 'lissanonpren@gmail.com',
    } as never);

    const res = await PATCH(makeReq('u1', { role: 'ADMIN' }), paramsOf('u1'));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('PROTECTED_ACCOUNT');
    expect(prismaMock.user.count).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('allows promoting the protected founder account to SUPERADMIN (a no-op if already SUPERADMIN, but never blocked)', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: 'ADMIN',
      email: 'lissanonpren@gmail.com',
    } as never);
    prismaMock.user.update.mockResolvedValueOnce({ id: 'u1', role: 'SUPERADMIN' } as never);

    const res = await PATCH(makeReq('u1', { role: 'SUPERADMIN' }), paramsOf('u1'));
    expect(res.status).toBe(200);
  });

  it('updates the role and logs user.role_change on the happy path', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u2',
      role: 'ADMIN',
      email: 'agent@test.local',
    } as never);
    prismaMock.user.update.mockResolvedValueOnce({ id: 'u2', role: 'SUPERADMIN' } as never);

    const res = await PATCH(makeReq('u2', { role: 'SUPERADMIN' }), paramsOf('u2'));

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: { role: 'SUPERADMIN' },
      select: { id: true, role: true },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.role_change',
        metadata: { from: 'ADMIN', to: 'SUPERADMIN' },
      }),
    );
  });

  it('rejects an invalid role value with 400 VALIDATION_FAILED', async () => {
    const res = await PATCH(makeReq('u1', { role: 'OWNER' }), paramsOf('u1'));
    expect(res.status).toBe(400);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
