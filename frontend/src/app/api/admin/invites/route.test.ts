import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware/require-module-permission', () => ({
  requireModulePermission: vi.fn(),
}));
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
vi.mock('@/lib/server/outbox', () => ({
  enqueueOutbox: vi.fn().mockResolvedValue({ id: 'outbox_1' }),
}));
vi.mock('@/lib/server/outbox/drain-now', () => ({
  drainOutboxNow: vi.fn().mockResolvedValue(undefined),
}));

import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enqueueOutbox } from '@/lib/server/outbox';
import { drainOutboxNow } from '@/lib/server/outbox/drain-now';
import { POST, GET } from './route';
import { seedSuperadmin, seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireModulePermission = vi.mocked(requireModulePermission);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const mockVerifyCsrf = vi.mocked(verifyCsrf);
const mockLogAdminAction = vi.mocked(logAdminAction);
const mockEnqueueOutbox = vi.mocked(enqueueOutbox);
const mockDrainOutboxNow = vi.mocked(drainOutboxNow);

const superadminUser = seedSuperadmin({ id: 'superadmin_1', email: 'superadmin@test.local' });
const superadminCtx = {
  user: { sub: superadminUser.id, email: superadminUser.email },
  admin: { id: superadminUser.id, email: superadminUser.email, role: 'SUPERADMIN' as const },
};
const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makePostReq(body: unknown): NextRequest {
  return new NextRequest('http://test/api/admin/invites', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  email: 'agent@educbenin.info',
  role: 'ADMIN',
  adminLabel: 'SUPPORT',
  modulePermissions: {
    dossiers: 'read',
    dossiersRejetes: 'none',
    specialites: 'none',
    tarifs: 'none',
    comptesAdmin: 'none',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireModulePermission.mockResolvedValue(superadminCtx);
  mockRateLimit.mockResolvedValue(null);
  mockVerifyCsrf.mockReturnValue(null);
  prismaMock.$transaction.mockImplementation((cb: unknown) => {
    if (typeof cb === 'function') {
      return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    }
    return Promise.resolve(cb);
  });
});

describe('POST /api/admin/invites', () => {
  it('requires "manage" on the Comptes admin module', async () => {
    mockRequireModulePermission.mockResolvedValueOnce(
      NextResponse.json({ error: 'MODULE_PERMISSION_REQUIRED' }, { status: 403 }),
    );
    const res = await POST(makePostReq(validBody));
    expect(res.status).toBe(403);
    expect(prismaMock.adminInvite.create).not.toHaveBeenCalled();
    expect(mockRequireModulePermission).toHaveBeenCalledWith(null, 'comptesAdmin', 'manage');
  });

  it('rejects when CSRF fails', async () => {
    mockVerifyCsrf.mockReturnValueOnce(
      NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }),
    );
    const res = await POST(makePostReq(validBody));
    expect(res.status).toBe(403);
    expect(mockRequireModulePermission).not.toHaveBeenCalled();
  });

  it('rejects an invalid body with 400 VALIDATION_FAILED', async () => {
    const res = await POST(makePostReq({ email: 'not-an-email', role: 'ADMIN' }));
    expect(res.status).toBe(400);
    expect(prismaMock.adminInvite.create).not.toHaveBeenCalled();
  });

  it('an ADMIN (with comptesAdmin:manage) cannot invite a SUPERADMIN', async () => {
    mockRequireModulePermission.mockResolvedValueOnce(adminCtx);
    const res = await POST(makePostReq({ ...validBody, role: 'SUPERADMIN' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('SUPERADMIN_INVITE_REQUIRES_SUPERADMIN');
    expect(prismaMock.adminInvite.create).not.toHaveBeenCalled();
  });

  it('an ADMIN (with comptesAdmin:manage) can invite an ADMIN or SUPPORT', async () => {
    mockRequireModulePermission.mockResolvedValueOnce(adminCtx);
    prismaMock.adminInvite.updateMany.mockResolvedValueOnce({ count: 0 } as never);
    prismaMock.adminInvite.create.mockResolvedValueOnce({
      id: 'invite_1',
      email: 'agent@educbenin.info',
      expiresAt: new Date('2026-01-01T00:10:00.000Z'),
    } as never);

    const res = await POST(makePostReq(validBody));
    expect(res.status).toBe(201);
  });

  it('a SUPERADMIN can invite another SUPERADMIN', async () => {
    prismaMock.adminInvite.updateMany.mockResolvedValueOnce({ count: 0 } as never);
    prismaMock.adminInvite.create.mockResolvedValueOnce({
      id: 'invite_1',
      email: 'newsuper@educbenin.info',
      expiresAt: new Date('2026-01-01T00:10:00.000Z'),
    } as never);

    const res = await POST(
      makePostReq({ ...validBody, email: 'newsuper@educbenin.info', role: 'SUPERADMIN' }),
    );
    expect(res.status).toBe(201);
  });

  it('revokes any pending invite for the same email, creates a new one, enqueues the email, and logs the action', async () => {
    prismaMock.adminInvite.updateMany.mockResolvedValueOnce({ count: 1 } as never);
    prismaMock.adminInvite.create.mockResolvedValueOnce({
      id: 'invite_1',
      email: 'agent@educbenin.info',
      expiresAt: new Date('2026-01-01T00:10:00.000Z'),
    } as never);

    const res = await POST(makePostReq(validBody));

    expect(res.status).toBe(201);
    expect(prismaMock.adminInvite.updateMany).toHaveBeenCalledWith({
      where: { email: 'agent@educbenin.info', consumedAt: null, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prismaMock.adminInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'agent@educbenin.info',
          role: 'ADMIN',
          adminLabel: 'SUPPORT',
          invitedByUserId: 'superadmin_1',
        }),
      }),
    );
    expect(mockEnqueueOutbox).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        kind: 'email.admin_invitation',
        payload: expect.objectContaining({ to: 'agent@educbenin.info', roleLabel: 'Support' }),
      }),
    );
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actorId: 'superadmin_1', action: 'admin.invite_sent' }),
    );
    // Immediate best-effort send — the daily-only cron would otherwise
    // leave this queued for up to 24h (see drain-now.ts).
    expect(mockDrainOutboxNow).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/admin/invites', () => {
  it('lists pending/expired invitations, requiring "read" on the Comptes admin module', async () => {
    mockRequireModulePermission.mockResolvedValueOnce(
      NextResponse.json({ error: 'MODULE_PERMISSION_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(new NextRequest('http://test/api/admin/invites'));
    expect(res.status).toBe(403);
    expect(mockRequireModulePermission).toHaveBeenCalledWith(null, 'comptesAdmin', 'read');
  });

  it('returns the invite list', async () => {
    prismaMock.adminInvite.findMany.mockResolvedValueOnce([
      {
        id: 'invite_1',
        email: 'agent@educbenin.info',
        role: 'ADMIN',
        adminLabel: 'SUPPORT',
        modulePermissions: validBody.modulePermissions,
        expiresAt: new Date('2026-01-01T00:10:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ] as never);
    const res = await GET(new NextRequest('http://test/api/admin/invites'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(1);
    expect(prismaMock.adminInvite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { consumedAt: null, revokedAt: null } }),
    );
  });
});
