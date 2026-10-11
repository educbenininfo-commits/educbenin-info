// GET /api/admin/analytics/live — lightweight live-visitor probe polled by the
// back-office (Statistiques screen and dashboard pill): distinct visitors
// with a page view in the last LIVE_WINDOW_MS, and the pages they're on.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { LIVE_WINDOW_MS, type LiveVisitorsResponse } from '@/lib/analytics';

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const since = new Date(Date.now() - LIVE_WINDOW_MS);
  const [live, pages] = await Promise.all([
    prisma.$queryRaw<Array<{ live: number }>>(Prisma.sql`
      SELECT count(DISTINCT "visitorId")::int AS live
      FROM "PageView"
      WHERE "createdAt" >= ${since}
    `),
    prisma.$queryRaw<Array<{ key: string; count: number }>>(Prisma.sql`
      SELECT "path" AS key, count(DISTINCT "visitorId")::int AS count
      FROM "PageView"
      WHERE "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 5
    `),
  ]);

  const body: LiveVisitorsResponse = { live: live[0]?.live ?? 0, pages };
  return NextResponse.json(body, { headers: { 'cache-control': 'no-store' } });
}
