export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { generateReference } from '@/lib/server/dossiers/reference';
import {
  uploadPublicFile,
  CANDIDATE_DOCUMENT_MAX_BYTES,
} from '@/lib/server/upload/uploadPublicFile';
import { SPECIALTIES } from '@/lib/specialties';
import { notifyAdmins } from '@/lib/server/push/send';
import { log } from '@/lib/server/observability/log';

const WHATSAPP_RE = /^\+229\s?(\d{2}\s?){4}$/;
const VALID_CODES = new Set(SPECIALTIES.map((s) => s.code));

const Fields = z.object({
  nom: z.string().trim().min(1),
  prenom: z.string().trim().min(1),
  whatsapp: z.string().trim().regex(WHATSAPP_RE),
  specialtyCodes: z
    .array(z.string())
    .min(1)
    .refine((codes) => codes.every((c) => VALID_CODES.has(c))),
  consent1: z.literal('true'),
  consent2: z.literal('true'),
  consent3: z.literal('true'),
  consent4: z.literal('true'),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'dossiers:create',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.DOSSIERS_CREATE_RATE_LIMIT_MAX ?? 10),
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
      nom: form.get('nom'),
      prenom: form.get('prenom'),
      whatsapp: form.get('whatsapp'),
      specialtyCodes: form.getAll('specialtyCodes'),
      consent1: form.get('consent1'),
      consent2: form.get('consent2'),
      consent3: form.get('consent3'),
      consent4: form.get('consent4'),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request' },
        { status: 400 },
      );
    }

    const pdf = form.get('pdf');
    if (!(pdf instanceof File)) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'PDF file is required' },
        { status: 400 },
      );
    }

    const { nom, prenom, whatsapp, specialtyCodes } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      const reference = await generateReference(tx);
      return tx.dossier.create({
        data: { reference, nom, prenom, whatsapp, specialtyCodes },
      });
    });

    // Upload happens after the row commits (reference must exist first to
    // build the storage path). If this fails, the dossier row survives
    // without a pieceJointeUrl — an operator sees an incomplete dossier in
    // the back-office rather than a silently lost submission.
    const upload = await uploadPublicFile(pdf, `dossiers/${created.reference}/piece-jointe`, {
      maxBytes: CANDIDATE_DOCUMENT_MAX_BYTES,
    });
    if (!upload.ok) {
      return NextResponse.json(
        { error: upload.error.code, message: 'File upload failed' },
        { status: upload.error.status },
      );
    }

    await prisma.dossier.update({
      where: { id: created.id },
      data: { pieceJointeUrl: upload.path },
    });

    try {
      await notifyAdmins({
        title: 'Nouveau dossier',
        body: `${nom} ${prenom} vient de déposer un dossier (${created.reference}).`,
        url: '/admin/dossiers',
      });
    } catch (err) {
      log.warn('dossiers: notifyAdmins failed', { err: String(err) });
    }

    return NextResponse.json({ reference: created.reference }, { status: 201 });
  });
}
