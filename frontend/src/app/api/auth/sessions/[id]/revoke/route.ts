// POST /api/auth/sessions/[id]/revoke — "Déconnecter" button per row in
// Paramètres → Sessions actives. Scoped to the caller's own sessions
// (revokeSession filters by userId, so guessing another user's session id
// 404s rather than revoking it). Revoking the row for THIS device also
// clears the current cookies — the request that triggered it is
// immediately logged out too, not just marked revoked server-side.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { requireAuth } from '@/lib/server/middleware';
import {
  COOKIE_NAME,
  verifyToken,
  verifyCsrf,
  clearAuthCookies,
  clearCsrfCookie,
} from '@/lib/server/auth';
import { revokeSession } from '@/lib/server/auth/sessions';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await ctx.params;
    const revoked = await revokeSession(id, auth.user.sub);
    if (!revoked) {
      return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
    }

    const store = await cookies();
    const accessCookie = store.get(COOKIE_NAME)?.value;
    const payload = accessCookie ? await verifyToken(accessCookie) : null;
    const isCurrentDevice = payload?.sid === id;
    if (isCurrentDevice) {
      await clearAuthCookies();
      await clearCsrfCookie();
    }

    return NextResponse.json({ ok: true, loggedOutThisDevice: isCurrentDevice });
  });
}
