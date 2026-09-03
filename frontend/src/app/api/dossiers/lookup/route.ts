export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Query = z.object({
  reference: z.string().trim().min(1),
  whatsapp: z.string().trim().min(1),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'dossiers:lookup',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.DOSSIERS_LOOKUP_RATE_LIMIT_MAX ?? 30),
  code: 'TOO_MANY_REQUESTS',
  message: 'Too many requests. Try again later.',
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const rateFail = await limiter.check(req, null);
    if (rateFail) return rateFail;

    const url = new URL(req.url);
    const parsed = Query.safeParse({
      reference: url.searchParams.get('reference'),
      whatsapp: url.searchParams.get('whatsapp'),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request' },
        { status: 400 },
      );
    }

    const dossier = await prisma.dossier.findFirst({
      where: { reference: parsed.data.reference, whatsapp: parsed.data.whatsapp },
      select: {
        reference: true,
        stage: true,
        motifRejet: true,
        ficheUploaded: true,
        recepisseUploaded: true,
        recepisseUrl: true,
      },
    });
    if (!dossier) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Dossier introuvable.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      reference: dossier.reference,
      stage: dossier.stage,
      motifRejet: dossier.stage === 0 ? dossier.motifRejet : null,
      ficheUploaded: dossier.ficheUploaded,
      recepisseUrl: dossier.stage === 5 && dossier.recepisseUploaded ? dossier.recepisseUrl : null,
    });
  });
}
