// POST /api/contact — public, no auth. Backs the /contact page form; each
// message lands in the back-office "Contact & messages" inbox (statut
// "nouveau"). Same rate-limit shape as POST /api/suggestions.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { getRedis } from '@/lib/server/redis';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z
  .object({
    nom: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200).optional(),
    telephone: z.string().trim().max(30).optional(),
    sujet: z.string().trim().max(200).optional(),
    message: z.string().trim().min(1).max(4000),
  })
  .refine((b) => Boolean(b.email || b.telephone), { message: 'CONTACT_REQUIRED' });

const redis = getRedis() ?? undefined;
const limiter = createEmailLimiter(
  { ...(redis ? { redis } : {}) },
  {
    bucket: 'contact:create',
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.CONTACT_CREATE_RATE_LIMIT_MAX ?? 10),
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

    const { nom, email, telephone, sujet, message } = parsed.data;
    const rateFail = await limiter.check(req, email ?? telephone ?? nom);
    if (rateFail) return rateFail;

    await prisma.contactMessage.create({
      data: {
        nom,
        email: email ?? null,
        telephone: telephone ?? null,
        sujet: sujet ?? null,
        message,
        statut: 'nouveau',
      },
    });

    return NextResponse.json(
      { ok: true },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
