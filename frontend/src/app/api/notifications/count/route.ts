// NOTIF-03 — GET /api/notifications/count
//
// Returns the unread badge count. Selective on the @@index([userId, readAt])
// from schema.prisma:211. Read-only — no CSRF needed.
//
// Optional `?types=A,B` narrows to specific Notification.type values — used
// by per-menu badges (e.g. the "Dossiers" nav item counting only
// DOSSIER_CREATED/DOSSIER_AUTH_SUBMITTED, see lib/notification-types.ts)
// instead of the global unread count.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const typesParam = req.nextUrl.searchParams.get('types');
    const types = typesParam
      ? typesParam
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : null;

    const where: Prisma.NotificationWhereInput = {
      userId: auth.user.sub,
      readAt: null,
      ...(types && types.length > 0 ? { type: { in: types } } : {}),
    };

    const count = await prisma.notification.count({ where });

    return NextResponse.json(
      { count },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
