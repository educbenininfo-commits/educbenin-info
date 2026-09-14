// POST /api/suggestions — public, no auth. Backs the "Suggérer" forms
// (site copy always says "Suggérer"/"Suggestions", never "Signaler"
// /"Signalements" — CLAUDE.md "Extension multi-écoles") on the home page
// and the École — INMeS page. Creates one Suggestion row, statut
// "nouveau", visible immediately in the back-office Suggestions screen
// (prompt 12-backoffice-suggestions.md, not built yet).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { getRedis } from '@/lib/server/redis';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  nom: z.string().trim().min(1).max(120),
  contact: z.string().trim().min(1).max(200),
  recherche: z.string().trim().min(1).max(300),
  message: z.string().trim().max(2000).optional(),
});

const redis = getRedis() ?? undefined;
const limiter = createEmailLimiter(
  { ...(redis ? { redis } : {}) },
  {
    bucket: 'suggestions:create',
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.SUGGESTIONS_CREATE_RATE_LIMIT_MAX ?? 10),
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Try again later.',
  },
);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const rateFail = await limiter.check(req, parsed.data.contact);
    if (rateFail) return rateFail;

    const { nom, contact, recherche, message } = parsed.data;
    await prisma.suggestion.create({
      data: { nom, contact, recherche, message: message ?? null, statut: 'nouveau' },
    });

    return NextResponse.json(
      { ok: true },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
