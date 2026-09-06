// Admin notification fan-out for dossier events (new dossier, auth-diplome
// form submitted). Two channels, both best-effort — neither may ever throw,
// since callers (dossier create, auth-form submit) must not fail the
// candidate's request over a notification problem:
//   1. In-app Notification rows (every ADMIN/SUPERADMIN, regardless of
//      whether they've installed the PWA) — this is what drives the unread
//      badge on the "Dossiers" nav item (see lib/notification-types.ts +
//      lib/useDossiersUnreadCount.ts).
//   2. Web Push (only devices subscribed via components/pwa/PushSetup.tsx,
//      which only offers to subscribe while running the installed PWA).
//      Lazy-configures VAPID the same way cloudinary-client.ts/
//      supabase-storage-client.ts gate on their own required env vars —
//      missing keys just skip this channel, in-app rows are unaffected.
import 'server-only';
import webpush from 'web-push';
import { prisma } from '@/lib/server/prisma';
import { log } from '@/lib/server/observability/log';
import { createNotification } from '@/lib/server/notifications';

export interface NotifyAdminsInput {
  title: string;
  body: string;
  /** Path to focus/open when the notification is clicked, e.g. "/admin/dossiers". */
  url: string;
  /** Notification.type — see lib/notification-types.ts. Drives per-menu unread badges. */
  type: string;
  /** Deterministic dedup base, WITHOUT the recipient suffix — `:${adminId}` is appended per admin. */
  dedupeKeyBase: string;
  data?: Record<string, unknown>;
}

let _configured = false;

function configureOnce(): boolean {
  if (_configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
  const subject = process.env.VAPID_SUBJECT ?? '';
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  _configured = true;
  return true;
}

async function createInAppNotifications(input: NotifyAdminsInput): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    select: { id: true },
  });

  await Promise.all(
    admins.map(async (admin) => {
      try {
        await createNotification(prisma, {
          userId: admin.id,
          type: input.type,
          title: input.title,
          body: input.body,
          ...(input.data ? { data: input.data } : {}),
          dedupeKey: `${input.dedupeKeyBase}:${admin.id}`,
        });
      } catch (err) {
        log.warn('notifyAdmins: createNotification failed', {
          adminId: admin.id,
          err: String(err),
        });
      }
    }),
  );
}

async function sendWebPush(input: NotifyAdminsInput): Promise<void> {
  if (!configureOnce()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify({ title: input.title, body: input.body, url: input.url });
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          log.warn('push: send failed', { subscriptionId: sub.id, err: String(err) });
        }
      }
    }),
  );

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }
}

/** Best-effort — never throws. See module doc for the two channels this fans out to. */
export async function notifyAdmins(input: NotifyAdminsInput): Promise<void> {
  await createInAppNotifications(input);
  await sendWebPush(input);
}
