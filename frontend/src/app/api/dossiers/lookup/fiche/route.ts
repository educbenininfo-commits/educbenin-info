export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { uploadPublicFile } from '@/lib/server/upload/uploadPublicFile';

const Fields = z.object({
  reference: z.string().trim().min(1),
  whatsapp: z.string().trim().min(1),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'dossiers:lookup-fiche',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.DOSSIERS_FICHE_RATE_LIMIT_MAX ?? 10),
  code: 'TOO_MANY_REQUESTS',
  message: 'Too many requests. Try again later.',
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const rateFail = await limiter.check(req, null);
    if (rateFail) return rateFail;

    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid form data' },
        { status: 400 },
      );
    }

    const parsed = Fields.safeParse({
      reference: form.get('reference'),
      whatsapp: form.get('whatsapp'),
    });
    const file = form.get('file');
    if (!parsed.success || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request' },
        { status: 400 },
      );
    }

    const dossier = await prisma.dossier.findFirst({
      where: { reference: parsed.data.reference, whatsapp: parsed.data.whatsapp },
      select: { id: true, reference: true, stage: true },
    });
    if (!dossier) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Dossier introuvable.' },
        { status: 404 },
      );
    }
    if (dossier.stage !== 3) {
      return NextResponse.json(
        { error: 'WRONG_STAGE', message: "Cette étape n'accepte pas de fiche pour le moment." },
        { status: 409 },
      );
    }

    const upload = await uploadPublicFile(file, `dossiers/${dossier.reference}/fiche-inscription`);
    if (!upload.ok) {
      return NextResponse.json(
        { error: upload.error.code, message: 'File upload failed' },
        { status: upload.error.status },
      );
    }

    await prisma.dossier.update({
      where: { id: dossier.id },
      data: { ficheUploaded: true, ficheUrl: upload.path },
    });

    return NextResponse.json({ ok: true });
  });
}
