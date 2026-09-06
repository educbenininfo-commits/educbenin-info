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

export type AuthTokenReason = 'invalid' | 'expired' | 'already-submitted' | 'wrong-stage';

export async function validateAuthToken(
  token: string,
): Promise<
  { valid: true; id: string; reference: string } | { valid: false; reason: AuthTokenReason }
> {
  const dossier = await prisma.dossier.findUnique({
    where: { authToken: token },
    select: {
      id: true,
      reference: true,
      stage: true,
      authTokenExpiresAt: true,
      authSubmittedAt: true,
    },
  });
  if (!dossier) return { valid: false, reason: 'invalid' };
  if (!dossier.authTokenExpiresAt || dossier.authTokenExpiresAt.getTime() < Date.now()) {
    return { valid: false, reason: 'expired' };
  }
  if (dossier.authSubmittedAt) return { valid: false, reason: 'already-submitted' };
  if (dossier.stage !== 2) return { valid: false, reason: 'wrong-stage' };
  return { valid: true, id: dossier.id, reference: dossier.reference };
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
    // `reference` on success, or `valid` + `reason` on failure.
    const body = result.valid ? { valid: true as const, reference: result.reference } : result;
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
  pays: z.string().trim().min(1),
  adresse: z.string().trim().min(1),
});

const Fields = z.object({
  nom: z.string().trim().min(1),
  prenom: z.string().trim().min(1),
  naissance: z.string().trim().min(1),
  lieuNaissance: z.string().trim().min(1),
  nationalite: z.string().trim().min(1),
  adresse: z.string().trim().min(1),
  piece: z.string().trim().min(1),
  pieceRef: z.string().trim().min(1),
  email: zEmail,
  tel: z.string().trim().min(1),
  bac: InstitutionFields,
  doctorat: InstitutionFields,
});

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
    });

    // Single combined upload — per product decision, the candidate submits
    // one PDF covering both the Bac and Doctorat diplomas (saves storage
    // space, and halves the upload count vs. the original two-file design).
    const documents = form.get('documents');
    if (!parsed.success || !(documents instanceof File)) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request' },
        { status: 400 },
      );
    }

    const { id, reference } = check;

    // Naming per docs/design-reference/prompts-par-ecran/16-formulaire-authentification-diplome.md:
    // originally "diplôme-nom-prénom-bac" / "-doctorat" for two files — now a
    // single "diplôme-nom-prénom" combined document. `reference` still scopes
    // the storage path for uniqueness (two dossiers can share a candidate name).
    const DIACRITICS_RE = new RegExp('[\\u0300-\\u036f]', 'g'); // combining marks (é→e, etc.)
    const slug = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(DIACRITICS_RE, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const namePart = `${slug(parsed.data.nom)}-${slug(parsed.data.prenom)}`;

    const upload = await uploadPublicFile(documents, `dossiers/${reference}/diplome-${namePart}`, {
      maxBytes: CANDIDATE_DOCUMENT_MAX_BYTES,
    });
    if (!upload.ok) {
      return NextResponse.json(
        { error: upload.error.code, message: 'File upload failed' },
        { status: upload.error.status },
      );
    }

    await prisma.dossier.update({
      where: { id },
      data: {
        authFormData: parsed.data,
        diplomaUrl: upload.path,
        authSubmittedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  });
}
