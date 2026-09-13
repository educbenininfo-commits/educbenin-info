// Records an ADMIN/SUPERADMIN login or logout: one AdminAction audit row
// (drives the /admin/connexions page) + a SUPERADMIN-only notification
// fan-out (in-app + push, see lib/server/push/send.ts's notifySuperadmins).
// Called from the 3 places a back-office account authenticates or signs
// out: /api/auth/login, /api/auth/oauth/google/callback, /api/auth/logout.
//
// Best-effort — never throws. This runs AFTER auth already succeeded (or
// AFTER the cookie-clearing on logout), so a failure here must never turn
// into a failed login/logout for the acting admin.
import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from './audit';
import { notifySuperadmins } from '@/lib/server/push/send';
import { ADMIN_LOGIN, ADMIN_LOGOUT } from '@/lib/notification-types';
import { log } from '@/lib/server/observability/log';

export interface AdminAuthEventInput {
  actorId: string;
  actorEmail: string;
  actorName: string | null;
  event: 'login' | 'logout';
  sessionId: string;
  ip?: string | null;
  userAgent?: string | null;
}

export async function recordAdminAuthEvent(input: AdminAuthEventInput): Promise<void> {
  try {
    await logAdminAction(prisma, {
      actorId: input.actorId,
      action: input.event === 'login' ? 'auth.login' : 'auth.logout',
      targetType: 'User',
      targetId: input.actorId,
      metadata: { email: input.actorEmail, name: input.actorName },
      ...(input.ip ? { ip: input.ip } : {}),
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    });
  } catch (err) {
    log.warn('recordAdminAuthEvent: logAdminAction failed', { err: String(err) });
  }

  const label = input.actorName ?? input.actorEmail;
  const title = input.event === 'login' ? 'Connexion administrateur' : 'Déconnexion administrateur';
  const body =
    input.event === 'login'
      ? `${label} vient de se connecter.`
      : `${label} vient de se déconnecter.`;

  try {
    await notifySuperadmins({
      title,
      body,
      url: '/admin/connexions',
      type: input.event === 'login' ? ADMIN_LOGIN : ADMIN_LOGOUT,
      dedupeKeyBase: `admin-auth-${input.event}:${input.sessionId}`,
      excludeUserId: input.actorId,
      data: { actorId: input.actorId, actorEmail: input.actorEmail, event: input.event },
    });
  } catch (err) {
    log.warn('recordAdminAuthEvent: notifySuperadmins failed', { err: String(err) });
  }
}
