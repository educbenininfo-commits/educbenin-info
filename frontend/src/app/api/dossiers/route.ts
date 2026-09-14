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
import { DOSSIER_CREATED } from '@/lib/notification-types';
import { ECOLE_FSS_ID, CATEGORIE_FSS_DES_ID } from '@/lib/server/schools/reference-ids';

// General E.164 shape ("+" + 7-15 digits) — was hardcoded to Bénin's
// "+229 XX XX XX XX" with a mandatory space; the candidate-facing form now
// accepts any country via CountryPhoneInput (lib/countries.ts), which
// always emits plain E.164 (no spaces).
const WHATSAPP_RE = /^\+[1-9]\d{6,14}$/;
const VALID_CODES = new Set(SPECIALTIES.map((s) => s.code));

const Fields = z.object({
  nom: z.string().trim().min(1),
  prenom: z.string().trim().min(1),
  whatsapp: z.string().trim().regex(WHATSAPP_RE),
  nationalite: z.string().trim().min(1).optional(), // ISO2 country code, see lib/countries.ts
  // Generic single-filière path (extension multi-écoles, 2026-09) — any
  // Categorie other than FSS's "Probatoire spécialité (D.E.S.)". When
  // absent, falls back to the legacy D.E.S. multi-select below (unchanged).
  categorieId: z.string().trim().min(1).optional(),
  filiereId: z.string().trim().min(1).optional(),
  // Legacy FSS "Probatoire spécialité (D.E.S.)" multi-select — a candidate
  // may apply to several specialties in one dossier. Required only when
  // categorieId is absent (validated below, not by zod, since the two
  // modes are mutually exclusive rather than independently optional).
  specialtyCodes: z.array(z.string()).optional(),
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

    const categorieIdField = form.get('categorieId');
    const parsed = Fields.safeParse({
      nom: form.get('nom'),
      prenom: form.get('prenom'),
      whatsapp: form.get('whatsapp'),
      nationalite: form.get('nationalite') ?? undefined,
      categorieId: categorieIdField ?? undefined,
      filiereId: form.get('filiereId') ?? undefined,
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

    const { nom, prenom, whatsapp, nationalite, categorieId, filiereId, specialtyCodes } =
      parsed.data;

    // Resolve which Ecole/Categorie/(Filiere) this dossier targets. Two
    // mutually exclusive modes:
    //   - categorieId present: the generic single-filière path used by
    //     every Categorie added by the multi-school extension (Licence,
    //     Master, INMeS Cycle I/II, …).
    //   - categorieId absent: the legacy FSS "Probatoire spécialité
    //     (D.E.S.)" multi-select path — unchanged validation/behavior.
    let targetEcoleId: string;
    let targetCategorieId: string;
    let targetFiliereId: string | null = null;
    let finalSpecialtyCodes: string[] = [];

    if (categorieId) {
      const categorie = await prisma.categorie.findUnique({
        where: { id: categorieId },
        select: { id: true, ecoleId: true, filieres: { select: { id: true } } },
      });
      if (!categorie) {
        return NextResponse.json(
          { error: 'VALIDATION_FAILED', message: 'Unknown categorieId' },
          { status: 400 },
        );
      }
      if (filiereId && !categorie.filieres.some((f) => f.id === filiereId)) {
        return NextResponse.json(
          { error: 'VALIDATION_FAILED', message: 'filiereId does not belong to categorieId' },
          { status: 400 },
        );
      }
      targetEcoleId = categorie.ecoleId;
      targetCategorieId = categorie.id;
      targetFiliereId = filiereId ?? null;
    } else {
      if (
        !specialtyCodes ||
        specialtyCodes.length < 1 ||
        !specialtyCodes.every((c) => VALID_CODES.has(c))
      ) {
        return NextResponse.json(
          { error: 'VALIDATION_FAILED', message: 'Invalid specialtyCodes' },
          { status: 400 },
        );
      }
      targetEcoleId = ECOLE_FSS_ID;
      targetCategorieId = CATEGORIE_FSS_DES_ID;
      finalSpecialtyCodes = specialtyCodes;
    }

    const created = await prisma.$transaction(async (tx) => {
      const reference = await generateReference(tx);
      return tx.dossier.create({
        data: {
          reference,
          nom,
          prenom,
          whatsapp,
          nationalite: nationalite ?? null,
          specialtyCodes: finalSpecialtyCodes,
          ecoleId: targetEcoleId,
          categorieId: targetCategorieId,
          ...(targetFiliereId ? { filiereId: targetFiliereId } : {}),
        },
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
        type: DOSSIER_CREATED,
        dedupeKeyBase: `dossier-created:${created.id}`,
        data: { dossierId: created.id, reference: created.reference },
      });
    } catch (err) {
      log.warn('dossiers: notifyAdmins failed', { err: String(err) });
    }

    return NextResponse.json({ reference: created.reference }, { status: 201 });
  });
}
