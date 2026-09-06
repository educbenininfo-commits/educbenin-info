// Web Push sender — notifies every admin device subscribed via
// components/pwa/PushSetup.tsx (only offered while running the installed
// PWA). Lazy-configures VAPID the same way cloudinary-client.ts/
// supabase-storage-client.ts gate on their own required env vars: missing
// keys make this a clean no-op instead of a crash, so a dev/preview
// environment without push configured still boots and creates dossiers
// fine — it just doesn't notify anyone.
import 'server-only';
import webpush from 'web-push';
import { prisma } from '@/lib/server/prisma';
import { log } from '@/lib/server/observability/log';

export interface PushPayload {
  title: string;
  body: string;
  /** Path to focus/open when the notification is clicked, e.g. "/admin/dossiers". */
  url: string;
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

/**
 * Sends `payload` to every stored PushSubscription. Best-effort: a
 * subscription the push service reports as gone (404/410 — uninstalled,
 * permission revoked, browser data cleared) is deleted; any other failure
 * is logged and skipped. Never throws — callers (dossier create, auth-form
 * submit) must not fail the candidate's request over a notification
 * problem.
 */
export async function notifyAdmins(payload: PushPayload): Promise<void> {
  if (!configureOnce()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
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
