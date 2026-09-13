import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware/require-module-permission', () => ({
  requireModulePermission: vi.fn(),
}));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));

import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { GET } from './route';
import { seedSuperadmin } from '@/test-utils/admin-fixtures';

const mockRequireModulePermission = vi.mocked(requireModulePermission);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const superadminUser = seedSuperadmin({ id: 'superadmin_1', email: 'superadmin@test.local' });
const superadminCtx = {
  user: { sub: superadminUser.id, email: superadminUser.email },
  admin: { id: superadminUser.id, email: superadminUser.email, role: 'SUPERADMIN' as const },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireModulePermission.mockResolvedValue(superadminCtx);
  mockRateLimit.mockResolvedValue(null);
});

describe('GET /api/admin/team', () => {
  it('requires "read" on the Comptes admin module', async () => {
    mockRequireModulePermission.mockResolvedValueOnce(
      NextResponse.json({ error: 'MODULE_PERMISSION_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(new NextRequest('http://test/api/admin/team'));
    expect(res.status).toBe(403);
    expect(mockRequireModulePermission).toHaveBeenCalledWith(null, 'comptesAdmin', 'read');
  });

  it('merges members and pending invites, marking an invite past expiresAt as EXPIRED', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 'user_1',
        email: 'super@educbenin.info',
        name: 'Super',
        role: 'SUPERADMIN',
        adminLabel: null,
        modulePermissions: null,
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ] as never);
    prismaMock.adminInvite.findMany.mockResolvedValueOnce([
      {
        id: 'invite_1',
        email: 'pending@educbenin.info',
        role: 'ADMIN',
        adminLabel: 'ADMIN',
        modulePermissions: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      },
      {
        id: 'invite_2',
        email: 'expired@educbenin.info',
        role: 'ADMIN',
        adminLabel: 'SUPPORT',
        modulePermissions: null,
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
      },
    ] as never);

    const res = await GET(new NextRequest('http://test/api/admin/team'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      members: unknown[];
      pendingInvites: { inviteId: string; status: string }[];
    };
    expect(body.members).toHaveLength(1);
    expect(body.pendingInvites).toEqual([
      expect.objectContaining({ inviteId: 'invite_1', status: 'PENDING' }),
      expect.objectContaining({ inviteId: 'invite_2', status: 'EXPIRED' }),
    ]);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: { in: ['ADMIN', 'SUPERADMIN'] } } }),
    );
    expect(prismaMock.adminInvite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { consumedAt: null, revokedAt: null } }),
    );
  });
});
