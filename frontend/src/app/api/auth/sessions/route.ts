// GET /api/auth/sessions — list the caller's own active (non-revoked)
// sessions for Paramètres → Sessions actives. Self-service only: there is
// no admin-facing "view another user's sessions" here.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { requireAuth } from '@/lib/server/middleware';
import { COOKIE_NAME, verifyToken } from '@/lib/server/auth';
import { listActiveSessions } from '@/lib/server/auth/sessions';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // Which row is "this device" — decode straight from the access cookie
    // rather than widening requireAuth's return shape (that file is
    // shared/protected; this stays a local, additive read).
    const store = await cookies();
    const accessCookie = store.get(COOKIE_NAME)?.value;
    const payload = accessCookie ? await verifyToken(accessCookie) : null;
    const currentSid = payload?.sid ?? null;

    const sessions = await listActiveSessions(auth.user.sub, currentSid);
    return NextResponse.json({ sessions });
  });
}
