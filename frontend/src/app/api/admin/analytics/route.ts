// GET /api/admin/analytics?granularity=minute|hour|day|week|month|year —
// back-office visit statistics from the first-party PageView table: a
// bucketed series (page views / visits = sessions / distinct visitors) over
// the granularity's window in Bénin local time, empty buckets filled with 0,
// the window totals, the live visitor count, and the top sources, countries,
// pages and devices over the same window.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import {
  ANALYTICS_TZ,
  GRANULARITY_CONFIG,
  LIVE_WINDOW_MS,
  bucketWindow,
  isGranularity,
  type AnalyticsBreakdownRow,
  type AnalyticsResponse,
} from '@/lib/analytics';

// Whitelisted column + counted expression per breakdown — never interpolate input.
const BREAKDOWNS = {
  sources: { col: Prisma.raw('"source"'), count: Prisma.raw('count(DISTINCT "sessionId")') },
  countries: { col: Prisma.raw('"country"'), count: Prisma.raw('count(DISTINCT "sessionId")') },
  pages: { col: Prisma.raw('"path"'), count: Prisma.raw('count(*)') },
  devices: { col: Prisma.raw('"device"'), count: Prisma.raw('count(DISTINCT "sessionId")') },
} as const;

async function breakdown(
  which: keyof typeof BREAKDOWNS,
  since: Date,
  limit: number,
): Promise<AnalyticsBreakdownRow[]> {
  const { col, count } = BREAKDOWNS[which];
  const rows = await prisma.$queryRaw<Array<{ key: string | null; count: number }>>(Prisma.sql`
    SELECT ${col} AS key, ${count}::int AS count
    FROM "PageView"
    WHERE "createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({ key: r.key ?? '', count: r.count }));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const raw = req.nextUrl.searchParams.get('granularity') ?? 'day';
  if (!isGranularity(raw)) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const granularity = raw;
  const now = new Date();
  const { keys, startUtc } = bucketWindow(granularity, now);
  const trunc = GRANULARITY_CONFIG[granularity].trunc;

  // "createdAt" is a UTC timestamp without zone: pin it to UTC, convert to
  // Bénin wall-clock, then truncate — same convention as bucketWindow().
  const [series, totals, live, sources, countries, pages, devices] = await Promise.all([
    prisma.$queryRaw<Array<{ key: string; views: number; visits: number; visitors: number }>>(
      Prisma.sql`
        SELECT to_char(
                 date_trunc(${trunc}, ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${ANALYTICS_TZ}),
                 'YYYY-MM-DD"T"HH24:MI'
               ) AS key,
               count(*)::int AS views,
               count(DISTINCT "sessionId")::int AS visits,
               count(DISTINCT "visitorId")::int AS visitors
        FROM "PageView"
        WHERE "createdAt" >= ${startUtc}
        GROUP BY 1
      `,
    ),
    prisma.$queryRaw<Array<{ views: number; visits: number; visitors: number }>>(Prisma.sql`
      SELECT count(*)::int AS views,
             count(DISTINCT "sessionId")::int AS visits,
             count(DISTINCT "visitorId")::int AS visitors
      FROM "PageView"
      WHERE "createdAt" >= ${startUtc}
    `),
    prisma.$queryRaw<Array<{ live: number }>>(Prisma.sql`
      SELECT count(DISTINCT "visitorId")::int AS live
      FROM "PageView"
      WHERE "createdAt" >= ${new Date(now.getTime() - LIVE_WINDOW_MS)}
    `),
    breakdown('sources', startUtc, 8),
    breakdown('countries', startUtc, 8),
    breakdown('pages', startUtc, 8),
    breakdown('devices', startUtc, 3),
  ]);

  const byKey = new Map(series.map((r) => [r.key, r]));
  const body: AnalyticsResponse = {
    granularity,
    live: live[0]?.live ?? 0,
    buckets: keys.map((key) => {
      const r = byKey.get(key);
      return { key, views: r?.views ?? 0, visits: r?.visits ?? 0, visitors: r?.visitors ?? 0 };
    }),
    totals: totals[0] ?? { views: 0, visits: 0, visitors: 0 },
    sources,
    countries,
    pages,
    devices,
  };
  return NextResponse.json(body);
}
