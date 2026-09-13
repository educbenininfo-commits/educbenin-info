// GET /api/admin/connexions — SUPERADMIN only. Paginated feed of
// ADMIN/SUPERADMIN login/logout events, backed by the AdminAction rows
// written by recordAdminAuthEvent (lib/server/admin/auth-events.ts) at
// login, the Google OAuth callback, and logout. Mirrors the cursor
// pagination pattern already used by /api/admin/audit-log.
//
// SUPERADMIN-gated (not plain ADMIN, unlike audit-log) — this is
// specifically a "who is signing in/out of the back-office" feed, which is
// more sensitive than the general action log.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, buildPage, decodeCursor } from '@/lib/server/pagination/paginate';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const AUTH_EVENT_ACTIONS = ['auth.login', 'auth.logout'];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('SUPERADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));

    const rows = await prisma.adminAction.findMany({
      where: { action: { in: AUTH_EVENT_ACTIONS }, ...cursorWhere(cursor) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        actorId: true,
        action: true,
        metadata: true,
        ip: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return NextResponse.json(buildPage(rows, limit), {
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}
