// notifySuperadmins — SUPERADMIN-only fan-out used by admin login/logout
// alerts (vs notifyAdmins's ADMIN+SUPERADMIN fan-out used for dossiers).
import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '@/test-utils/prisma-mock';
import { notifySuperadmins } from './send';

beforeEach(() => {
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
});

describe('notifySuperadmins', () => {
  it('creates an in-app Notification for every SUPERADMIN, excluding excludeUserId', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'super-1' }, { id: 'super-2' }] as never);
    prismaMock.notification.create.mockResolvedValue({ id: 'n-1' } as never);

    await notifySuperadmins({
      title: 'Connexion administrateur',
      body: 'Admin One vient de se connecter.',
      url: '/admin/connexions',
      type: 'ADMIN_LOGIN',
      dedupeKeyBase: 'admin-auth-login:sess-1',
      excludeUserId: 'actor-1',
    });

    const findManyArgs = prismaMock.user.findMany.mock.calls[0]?.[0];
    expect(findManyArgs?.where).toEqual({
      role: 'SUPERADMIN',
      id: { not: 'actor-1' },
    });

    expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
    const dedupeKeys = prismaMock.notification.create.mock.calls.map((c) => c[0]?.data?.dedupeKey);
    expect(dedupeKeys.sort()).toEqual([
      'admin-auth-login:sess-1:super-1',
      'admin-auth-login:sess-1:super-2',
    ]);
  });

  it('skips web push entirely when VAPID env vars are not configured', async () => {
    prismaMock.user.findMany.mockResolvedValue([] as never);

    await notifySuperadmins({
      title: 't',
      body: 'b',
      url: '/admin/connexions',
      type: 'ADMIN_LOGIN',
      dedupeKeyBase: 'k',
    });

    expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled();
  });

  it('never throws when the in-app notification query rejects', async () => {
    prismaMock.user.findMany.mockRejectedValue(new Error('db down'));

    await expect(
      notifySuperadmins({
        title: 't',
        body: 'b',
        url: '/admin/connexions',
        type: 'ADMIN_LOGIN',
        dedupeKeyBase: 'k',
      }),
    ).rejects.toThrow('db down');
  });
});
