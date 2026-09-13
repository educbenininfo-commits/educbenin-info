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
import { POST } from './route';
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
function makeReq(id: string): NextRequest {
  return new NextRequest(`http://test/api/admin/users/${id}/remove`, { method: 'POST' });
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

describe('POST /api/admin/users/[id]/remove', () => {
  it('requires SUPERADMIN', async () => {
    mockRequireSuperadmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await POST(makeReq('u1'), paramsOf('u1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when the target does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeReq('missing'), paramsOf('missing'));
    expect(res.status).toBe(404);
  });

  it('refuses to remove the last SUPERADMIN', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: 'SUPERADMIN',
      email: 'a@test.local',
      name: null,
      adminLabel: null,
    } as never);
    prismaMock.user.count.mockResolvedValueOnce(1);

    const res = await POST(makeReq('u1'), paramsOf('u1'));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('LAST_SUPERADMIN');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('refuses to remove the protected founder account, even when other SUPERADMINs exist', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: 'SUPERADMIN',
      email: 'lissanonpren@gmail.com',
      name: 'Horace',
      adminLabel: null,
    } as never);

    const res = await POST(makeReq('u1'), paramsOf('u1'));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('PROTECTED_ACCOUNT');
    expect(prismaMock.user.count).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('allows removing a SUPERADMIN when another one exists', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      role: 'SUPERADMIN',
      email: 'a@test.local',
      name: null,
      adminLabel: null,
    } as never);
    prismaMock.user.count.mockResolvedValueOnce(2);
    prismaMock.user.update.mockResolvedValueOnce({} as never);

    const res = await POST(makeReq('u1'), paramsOf('u1'));
    expect(res.status).toBe(200);
  });

  it('revokes role/status/password/sessions/oauth and logs user.remove_from_backoffice for an ADMIN target', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u2',
      role: 'ADMIN',
      email: 'agent@test.local',
      name: 'Agent',
      adminLabel: 'SUPPORT',
    } as never);
    prismaMock.user.update.mockResolvedValueOnce({} as never);
    prismaMock.oAuthAccount.deleteMany.mockResolvedValueOnce({ count: 1 } as never);
    prismaMock.session.updateMany.mockResolvedValueOnce({ count: 2 } as never);

    const res = await POST(makeReq('u2'), paramsOf('u2'));

    expect(res.status).toBe(200);
    expect(prismaMock.user.count).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u2' },
        data: expect.objectContaining({
          role: 'USER',
          status: 'SUSPENDED',
          adminLabel: null,
          passwordHash: null,
          tokenVersion: { increment: 1 },
        }),
      }),
    );
    expect(prismaMock.oAuthAccount.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u2' } });
    expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u2', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.remove_from_backoffice',
        targetType: 'User',
        targetId: 'u2',
        metadata: expect.objectContaining({ previousRole: 'ADMIN', previousAdminLabel: 'SUPPORT' }),
      }),
    );
  });

  it('rejects when CSRF fails', async () => {
    mockVerifyCsrf.mockReturnValueOnce(
      NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }),
    );
    const res = await POST(makeReq('u1'), paramsOf('u1'));
    expect(res.status).toBe(403);
    expect(mockRequireSuperadmin).not.toHaveBeenCalled();
  });
});
