export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { zEmail } from '@/lib/server/zod-helpers';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  uploadPublicFile,
  CANDIDATE_DOCUMENT_MAX_BYTES,
} from '@/lib/server/upload/uploadPublicFile';
import { notifyAdmins } from '@/lib/server/push/send';
import { log } from '@/lib/server/observability/log';
import { DOSSIER_AUTH_SUBMITTED } from '@/lib/notification-types';
import type { AuthForm } from '@/lib/dossiers-data';

export type AuthTokenReason = 'invalid' | 'expired' | 'already-submitted' | 'wrong-stage';

export async function validateAuthToken(
  token: string,
): Promise<
  | { valid: true; id: string; reference: string; authFormData: AuthForm | null }
  | { valid: false; reason: AuthTokenReason }
> {
  const dossier = await prisma.dossier.findUnique({
    where: { authToken: token },
    select: {
      id: true,
      reference: true,
      stage: true,
      authTokenExpiresAt: true,
      authSubmittedAt: true,
      authFormData: true,
    },
  });
  if (!dossier) return { valid: false, reason: 'invalid' };
  if (!dossier.authTokenExpiresAt || dossier.authTokenExpiresAt.getTime() < Date.now()) {
    return { valid: false, reason: 'expired' };
  }
  // `authSubmittedAt` is cleared back to null by a "renvoyer" from the
  // back-office (see auth-send/route.ts), so a resend correctly reopens
  // this same link for resubmission — this check only fires for a
  // candidate re-visiting a link they already used with no resend issued.
  if (dossier.authSubmittedAt) return { valid: false, reason: 'already-submitted' };
  if (dossier.stage !== 2) return { valid: false, reason: 'wrong-stage' };
  return {
    valid: true,
    id: dossier.id,
    reference: dossier.reference,
    authFormData: dossier.authFormData as AuthForm | null,
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const { token } = await ctx.params;
    const result = await validateAuthToken(token);
    // Public response never leaks the internal `id` — only `valid` +
    // `reference` (+ any pre-existing `authFormData`, for a resend's
    // prefill) on success, or `valid` + `reason` on failure.
    const body = result.valid
      ? {
          valid: true as const,
          reference: result.reference,
          authFormData: result.authFormData,
        }
      : result;
    return NextResponse.json(body);
  });
}

const REASON_STATUS: Record<AuthTokenReason, number> = {
  invalid: 404,
  expired: 410,
  'already-submitted': 409,
  'wrong-stage': 409,
};
const REASON_CODE: Record<AuthTokenReason, string> = {
  invalid: 'TOKEN_INVALID',
  expired: 'TOKEN_EXPIRED',
  'already-submitted': 'TOKEN_ALREADY_SUBMITTED',
  'wrong-stage': 'TOKEN_WRONG_STAGE',
};

const InstitutionFields = z.object({
  institution: z.string().trim().min(1),
  email: zEmail,
  annee: z.string().trim().min(1),
  pays: z.string().trim().min(1), // ISO2 country code, see lib/countries.ts
  adresse: z.string().trim().min(1),
});

const Fields = z.object({
  nom: z.string().trim().min(1),
  prenom: z.string().trim().min(1),
  naissance: z.string().trim().min(1),
  lieuNaissance: z.string().trim().min(1),
  nationalite: z.string().trim().min(1), // ISO2 country code
  adresse: z.string().trim().min(1),
  piece: z.string().trim().min(1),
  pieceRef: z.string().trim().min(1),
  email: zEmail,
  tel: z.string().trim().min(1), // E.164
  bac: InstitutionFields,
  doctorat: InstitutionFields,
  // "true"/"false" over multipart form fields — mirrors the existing
  // consent1..4 boolean-as-string pattern in /api/dossiers.
  diplomeNonFrancais: z.enum(['true', 'false']),
});

const DIACRITICS_RE = new RegExp('[\\u0300-\\u036f]', 'g'); // combining marks (é→e, etc.)
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const { token } = await ctx.params;
    const check = await validateAuthToken(token);
    if (!check.valid) {
      return NextResponse.json(
        { error: REASON_CODE[check.reason] },
        { status: REASON_STATUS[check.reason] },
      );
    }

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
      naissance: form.get('naissance'),
      lieuNaissance: form.get('lieuNaissance'),
      nationalite: form.get('nationalite'),
      adresse: form.get('adresse'),
      piece: form.get('piece'),
      pieceRef: form.get('pieceRef'),
      email: form.get('email'),
      tel: form.get('tel'),
      bac: {
        institution: form.get('bac.institution'),
        email: form.get('bac.email'),
        annee: form.get('bac.annee'),
        pays: form.get('bac.pays'),
        adresse: form.get('bac.adresse'),
      },
      doctorat: {
        institution: form.get('doctorat.institution'),
        email: form.get('doctorat.email'),
        annee: form.get('doctorat.annee'),
        pays: form.get('doctorat.pays'),
        adresse: form.get('doctorat.adresse'),
      },
      diplomeNonFrancais: form.get('diplomeNonFrancais') ?? 'false',
    });

    // Two required uploads (Bac, Doctorat) — reverted from the earlier
    // single-combined-PDF product decision back to per-diploma files, per
    // product request. Two more become required only when the candidate
    // flags their originals as non-French (diplomeNonFrancais=true).
    const documentsBac = form.get('documentsBac');
    const documentsDoctorat = form.get('documentsDoctorat');
    const documentsBacTraduit = form.get('documentsBacTraduit');
    const documentsDoctoratTraduit = form.get('documentsDoctoratTraduit');

    if (
      !parsed.success ||
      !(documentsBac instanceof File) ||
      !(documentsDoctorat instanceof File)
    ) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request' },
        { status: 400 },
      );
    }
    const needsTranslation = parsed.data.diplomeNonFrancais === 'true';
    if (
      needsTranslation &&
      (!(documentsBacTraduit instanceof File) || !(documentsDoctoratTraduit instanceof File))
    ) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: 'Translated diploma documents are required',
        },
        { status: 400 },
      );
    }

    const { id, reference } = check;
    const namePart = `${slug(parsed.data.nom)}-${slug(parsed.data.prenom)}`;
    const basePath = `dossiers/${reference}/diplome-${namePart}`;

    const uploadBac = await uploadPublicFile(documentsBac, `${basePath}-bac`, {
      maxBytes: CANDIDATE_DOCUMENT_MAX_BYTES,
    });
    if (!uploadBac.ok) {
      return NextResponse.json(
        { error: uploadBac.error.code, message: 'File upload failed' },
        { status: uploadBac.error.status },
      );
    }
    const uploadDoctorat = await uploadPublicFile(documentsDoctorat, `${basePath}-doctorat`, {
      maxBytes: CANDIDATE_DOCUMENT_MAX_BYTES,
    });
    if (!uploadDoctorat.ok) {
      return NextResponse.json(
        { error: uploadDoctorat.error.code, message: 'File upload failed' },
        { status: uploadDoctorat.error.status },
      );
    }

    let uploadBacTraduit: Awaited<ReturnType<typeof uploadPublicFile>> | null = null;
    let uploadDoctoratTraduit: Awaited<ReturnType<typeof uploadPublicFile>> | null = null;
    if (needsTranslation) {
      uploadBacTraduit = await uploadPublicFile(
        documentsBacTraduit as File,
        `${basePath}-bac-traduit`,
        { maxBytes: CANDIDATE_DOCUMENT_MAX_BYTES },
      );
      if (!uploadBacTraduit.ok) {
        return NextResponse.json(
          { error: uploadBacTraduit.error.code, message: 'File upload failed' },
          { status: uploadBacTraduit.error.status },
        );
      }
      uploadDoctoratTraduit = await uploadPublicFile(
        documentsDoctoratTraduit as File,
        `${basePath}-doctorat-traduit`,
        { maxBytes: CANDIDATE_DOCUMENT_MAX_BYTES },
      );
      if (!uploadDoctoratTraduit.ok) {
        return NextResponse.json(
          { error: uploadDoctoratTraduit.error.code, message: 'File upload failed' },
          { status: uploadDoctoratTraduit.error.status },
        );
      }
    }

    await prisma.dossier.update({
      where: { id },
      data: {
        // Overrides the string "true"/"false" the wire format uses with a
        // real boolean, so it round-trips correctly for prefill/display.
        authFormData: { ...parsed.data, diplomeNonFrancais: needsTranslation },
        diplomaBacUrl: uploadBac.path,
        diplomaDoctoratUrl: uploadDoctorat.path,
        diplomaBacTranslatedUrl: uploadBacTraduit?.ok ? uploadBacTraduit.path : null,
        diplomaDoctoratTranslatedUrl: uploadDoctoratTraduit?.ok ? uploadDoctoratTraduit.path : null,
        authSubmittedAt: new Date(),
        correctionRequestedAt: null,
      },
    });

    try {
      await notifyAdmins({
        title: "Formulaire d'authentification reçu",
        body: `${parsed.data.nom} ${parsed.data.prenom} a soumis son dossier d'authentification de diplôme (${reference}).`,
        url: '/admin/dossiers',
        type: DOSSIER_AUTH_SUBMITTED,
        dedupeKeyBase: `dossier-auth-submitted:${id}`,
        data: { dossierId: id, reference },
      });
    } catch (err) {
      log.warn('auth-form: notifyAdmins failed', { err: String(err) });
    }

    return NextResponse.json({ ok: true });
  });
}
