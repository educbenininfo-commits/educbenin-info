// recordAdminAuthEvent — writes the AdminAction audit row and dispatches
// the SUPERADMIN-only notification fan-out. Best-effort: neither dependency
// failing should ever throw back to the caller (a login/logout route).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test-utils/prisma-mock';

vi.mock('./audit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/server/push/send', () => ({
  notifySuperadmins: vi.fn().mockResolvedValue(undefined),
}));

import { logAdminAction } from './audit';
import { notifySuperadmins } from '@/lib/server/push/send';
import { recordAdminAuthEvent } from './auth-events';

const mockLogAdminAction = vi.mocked(logAdminAction);
const mockNotifySuperadmins = vi.mocked(notifySuperadmins);

beforeEach(() => {
  vi.clearAllMocks();
  mockLogAdminAction.mockResolvedValue(undefined);
  mockNotifySuperadmins.mockResolvedValue(undefined);
});

describe('recordAdminAuthEvent', () => {
  it('login: writes an auth.login AdminAction row and notifies superadmins, excluding the actor', async () => {
    await recordAdminAuthEvent({
      actorId: 'u-admin',
      actorEmail: 'admin@b.com',
      actorName: 'Admin One',
      event: 'login',
      sessionId: 'sess-1',
      ip: '1.2.3.4',
      userAgent: 'jest',
    });

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: 'u-admin',
        action: 'auth.login',
        targetType: 'User',
        targetId: 'u-admin',
        metadata: { email: 'admin@b.com', name: 'Admin One' },
        ip: '1.2.3.4',
        userAgent: 'jest',
      }),
    );

    expect(mockNotifySuperadmins).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADMIN_LOGIN',
        dedupeKeyBase: 'admin-auth-login:sess-1',
        excludeUserId: 'u-admin',
        title: 'Connexion administrateur',
      }),
    );
  });

  it('logout: writes an auth.logout row and uses the ADMIN_LOGOUT type', async () => {
    await recordAdminAuthEvent({
      actorId: 'u-admin',
      actorEmail: 'admin@b.com',
      actorName: null,
      event: 'logout',
      sessionId: 'sess-2',
    });

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'auth.logout' }),
    );
    expect(mockNotifySuperadmins).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADMIN_LOGOUT',
        dedupeKeyBase: 'admin-auth-logout:sess-2',
        title: 'Déconnexion administrateur',
      }),
    );
  });

  it('falls back to actorEmail in the notification body when actorName is null', async () => {
    await recordAdminAuthEvent({
      actorId: 'u-admin',
      actorEmail: 'admin@b.com',
      actorName: null,
      event: 'login',
      sessionId: 'sess-3',
    });
    const call = mockNotifySuperadmins.mock.calls[0]?.[0];
    expect(call?.body).toContain('admin@b.com');
  });

  it('never throws when logAdminAction rejects', async () => {
    mockLogAdminAction.mockRejectedValueOnce(new Error('db down'));
    await expect(
      recordAdminAuthEvent({
        actorId: 'u-admin',
        actorEmail: 'admin@b.com',
        actorName: null,
        event: 'login',
        sessionId: 'sess-4',
      }),
    ).resolves.toBeUndefined();
    // Still attempts the notification fan-out despite the audit-log failure.
    expect(mockNotifySuperadmins).toHaveBeenCalledTimes(1);
  });

  it('never throws when notifySuperadmins rejects', async () => {
    mockNotifySuperadmins.mockRejectedValueOnce(new Error('push down'));
    await expect(
      recordAdminAuthEvent({
        actorId: 'u-admin',
        actorEmail: 'admin@b.com',
        actorName: null,
        event: 'login',
        sessionId: 'sess-5',
      }),
    ).resolves.toBeUndefined();
  });
});
