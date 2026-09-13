import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth');
  return { ...actual, hashPassword: vi.fn().mockResolvedValue('hashed_pw') };
});
vi.mock('@/lib/server/auth/banned-passwords', () => ({ isBanned: vi.fn().mockReturnValue(false) }));
vi.mock('@/lib/server/auth/hibp', () => ({ isPwned: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/server/admin/audit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

import { hashPassword } from '@/lib/server/auth';
import { isBanned } from '@/lib/server/auth/banned-passwords';
import { logAdminAction } from '@/lib/server/admin/audit';
import { POST } from './route';

const mockHashPassword = vi.mocked(hashPassword);
const mockIsBanned = vi.mocked(isBanned);
const mockLogAdminAction = vi.mocked(logAdminAction);

function paramsOf(token: string): { params: Promise<{ token: string }> } {
  return { params: Promise.resolve({ token }) };
}
function makeReq(token: string, body: unknown): NextRequest {
  return new NextRequest(`http://test/api/admin/invites/${token}/confirm`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const gmailInvite = {
  id: 'invite_1',
  email: 'agent@gmail.com',
  role: 'ADMIN',
  adminLabel: 'SUPPORT',
  modulePermissions: { dossiers: 'read' },
  expiresAt: new Date(Date.now() + 60_000),
  consumedAt: null,
  revokedAt: null,
};

const nonGmailInvite = { ...gmailInvite, id: 'invite_2', email: 'agent@educbenin.info' };

beforeEach(() => {
  vi.clearAllMocks();
  mockIsBanned.mockReturnValue(false);
  mockHashPassword.mockResolvedValue('hashed_pw');
  prismaMock.$transaction.mockImplementation((cb: unknown) => {
    if (typeof cb === 'function') {
      return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    }
    return Promise.resolve(cb);
  });
});

describe('POST /api/admin/invites/[token]/confirm', () => {
  it('returns 404 for an invalid token', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq('bad', {}), paramsOf('bad'));
    expect(res.status).toBe(404);
  });

  it('gmail branch: confirms with no password, creates the User with the invite role/perms, marks consumedAt', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValue(gmailInvite as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({ id: 'user_new' } as never);

    const res = await POST(makeReq('tok', {}), paramsOf('tok'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, isGmail: true });
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'agent@gmail.com',
          role: 'ADMIN',
          adminLabel: 'SUPPORT',
          passwordHash: null,
        }),
      }),
    );
    expect(prismaMock.adminInvite.update).toHaveBeenCalledWith({
      where: { id: 'invite_1' },
      data: { consumedAt: expect.any(Date) },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'admin.invite_confirmed',
        metadata: expect.objectContaining({ viaGoogle: true }),
      }),
    );
  });

  it('non-gmail branch: requires a password and hashes it before storing', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValue(nonGmailInvite as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({ id: 'user_new' } as never);

    const res = await POST(makeReq('tok', { password: 'a-strong-password-1' }), paramsOf('tok'));

    expect(res.status).toBe(200);
    expect(mockHashPassword).toHaveBeenCalledWith('a-strong-password-1');
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: 'hashed_pw' }) }),
    );
  });

  it('non-gmail branch: rejects a too-short password with 400 before touching the DB', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValue(nonGmailInvite as never);
    const res = await POST(makeReq('tok', { password: 'short' }), paramsOf('tok'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('PASSWORD_TOO_SHORT');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('non-gmail branch: rejects a banned password with 400', async () => {
    mockIsBanned.mockReturnValueOnce(true);
    prismaMock.adminInvite.findUnique.mockResolvedValue(nonGmailInvite as never);
    const res = await POST(makeReq('tok', { password: 'password123' }), paramsOf('tok'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('PASSWORD_BANNED');
  });

  it('upgrades an existing User row (e.g. a former candidate account) instead of creating a duplicate', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValue(gmailInvite as never);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'existing_user',
      role: 'USER',
    } as never);
    prismaMock.user.update.mockResolvedValueOnce({ id: 'existing_user' } as never);

    const res = await POST(makeReq('tok', {}), paramsOf('tok'));

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'existing_user' },
        data: expect.objectContaining({ role: 'ADMIN', status: 'ACTIVE' }),
      }),
    );
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the invite is consumed/expired between the GET check and the transaction (race)', async () => {
    prismaMock.adminInvite.findUnique
      .mockResolvedValueOnce(gmailInvite as never)
      .mockResolvedValueOnce({ ...gmailInvite, consumedAt: new Date() } as never);

    const res = await POST(makeReq('tok', {}), paramsOf('tok'));

    expect(res.status).toBe(409);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
