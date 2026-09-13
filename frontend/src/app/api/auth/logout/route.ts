// POST /api/auth/logout — AUTH-05.
//
// Source: RESEARCH.md Pattern 13.
//
// Mutating route — CSRF-gated per D-02 (T-1-03 mitigation: prevents
// attacker-forced logout via CSRF). verifyCsrf returns null if header+cookie
// match (or for safe methods); a NextResponse 403 to short-circuit otherwise.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import {
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  clearCsrfCookie,
  verifyCsrf,
  verifyRefreshToken,
} from '@/lib/server/auth';
import { revokeSession } from '@/lib/server/auth/sessions';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { recordAdminAuthEvent } from '@/lib/server/admin/auth-events';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) {
      csrfFail.headers.set('x-request-id', ctx.requestId);
      return csrfFail;
    }

    // Best-effort — revoke this device's Session row so a previously
    // exfiltrated refresh token can't outlive an explicit logout. Never
    // blocks the actual cookie-clearing below on failure.
    try {
      const refreshCookie = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
      const payload = refreshCookie ? await verifyRefreshToken(refreshCookie) : null;
      if (payload) {
        const revoked = await revokeSession(payload.sid, payload.sub);
        if (revoked && payload.sid) {
          // Back-office visibility (not USER-role candidates) — best-effort.
          // See lib/server/admin/auth-events.ts.
          const actor = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { email: true, name: true, role: true },
          });
          if (actor && actor.role !== 'USER') {
            await recordAdminAuthEvent({
              actorId: payload.sub,
              actorEmail: actor.email,
              actorName: actor.name ?? null,
              event: 'logout',
              sessionId: payload.sid,
              ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
              userAgent: req.headers.get('user-agent'),
            });
          }
        }
      }
    } catch {
      // ignore — logout must succeed regardless
    }

    await clearAuthCookies();
    await clearCsrfCookie();

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
