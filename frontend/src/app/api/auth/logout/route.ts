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
      if (payload) await revokeSession(payload.sid, payload.sub);
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
