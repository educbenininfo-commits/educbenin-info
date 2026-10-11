// POST /api/track — public, no auth, no cookies. First-party page-view beacon
// sent by <PageViewTracker /> on every public route change; feeds the
// back-office "Statistiques" screen. Stores no IP and no personal data: the
// visitor/session ids are random tokens kept in the browser's own storage,
// the country comes from the hosting edge header. Bots are dropped, and a
// per-visitor rate limit caps how much a single browser can write.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { getRedis } from '@/lib/server/redis';
import { classifySource, deviceFromUA, isBot, isTrackablePath } from '@/lib/analytics';

const Body = z.object({
  visitorId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  path: z.string().startsWith('/').max(300),
  referrer: z.string().max(500).optional(),
  utmSource: z.string().max(80).optional(),
});

const redis = getRedis() ?? undefined;
const limiter = createEmailLimiter(
  { ...(redis ? { redis } : {}) },
  {
    bucket: 'track:pageview',
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.TRACK_RATE_LIMIT_MAX ?? 300),
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Try again later.',
  },
);

const NO_CONTENT = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ua = req.headers.get('user-agent');
  if (isBot(ua)) return NO_CONTENT();

  // sendBeacon posts text/plain, so parse the raw text rather than req.json().
  const raw = await req.text().catch(() => '');
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    /* falls through to validation failure */
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });

  const { visitorId, sessionId, referrer, utmSource } = parsed.data;
  const path = parsed.data.path.split(/[?#]/)[0] || '/';
  if (!isTrackablePath(path)) return NO_CONTENT();

  const rateFail = await limiter.check(req, visitorId);
  if (rateFail) return rateFail;

  const country = req.headers.get('x-vercel-ip-country');
  await prisma.pageView.create({
    data: {
      visitorId,
      sessionId,
      path,
      referrer: referrer ? referrer.slice(0, 500) : null,
      source: classifySource(referrer, utmSource, req.headers.get('host')),
      country: country && /^[A-Z]{2}$/i.test(country) ? country.toUpperCase() : null,
      device: deviceFromUA(ua),
    },
  });

  return NO_CONTENT();
}
