// Public correction endpoint for the Demande form (stage 1) — the
// counterpart of /api/dossiers/auth-form/[token] for stage 2. Reached via
// the link an admin sends from "Renvoyer pour correction"
// (POST /api/admin/dossiers/[id]/send-correction). Updates the SAME
// dossier row in place — never creates a new one — and clears
// `correctionRequestedAt` so the "Dossier MAJ" pill disappears once the
// candidate resubmits.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  uploadPublicFile,
  CANDIDATE_DOCUMENT_MAX_BYTES,
} from '@/lib/server/upload/uploadPublicFile';
import { SPECIALTIES } from '@/lib/specialties';

export type CorrectionTokenReason = 'invalid' | 'expired' | 'wrong-stage';

interface DossierPrefill {
  nom: string;
  prenom: string;
  whatsapp: string;
  nationalite: string | null;
  specialtyCodes: string[];
}

async function validateCorrectionToken(
  token: string,
): Promise<
  | { valid: true; id: string; reference: string; prefill: DossierPrefill }
  | { valid: false; reason: CorrectionTokenReason }
> {
  const dossier = await prisma.dossier.findUnique({
    where: { correctionToken: token },
    select: {
      id: true,
      reference: true,
      stage: true,
      correctionTokenExpiresAt: true,
      nom: true,
      prenom: true,
      whatsapp: true,
      nationalite: true,
      specialtyCodes: true,
    },
  });
  if (!dossier) return { valid: false, reason: 'invalid' };
  if (
    !dossier.correctionTokenExpiresAt ||
    dossier.correctionTokenExpiresAt.getTime() < Date.now()
  ) {
    return { valid: false, reason: 'expired' };
  }
  if (dossier.stage !== 1) return { valid: false, reason: 'wrong-stage' };
  return {
    valid: true,
    id: dossier.id,
    reference: dossier.reference,
    prefill: {
      nom: dossier.nom,
      prenom: dossier.prenom,
      whatsapp: dossier.whatsapp,
      nationalite: dossier.nationalite,
      specialtyCodes: dossier.specialtyCodes,
    },
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const { token } = await ctx.params;
    const result = await validateCorrectionToken(token);
    const body = result.valid
      ? { valid: true as const, reference: result.reference, prefill: result.prefill }
      : result;
    return NextResponse.json(body);
  });
}

const REASON_STATUS: Record<CorrectionTokenReason, number> = {
  invalid: 404,
  expired: 410,
  'wrong-stage': 409,
};
const REASON_CODE: Record<CorrectionTokenReason, string> = {
  invalid: 'TOKEN_INVALID',
  expired: 'TOKEN_EXPIRED',
  'wrong-stage': 'TOKEN_WRONG_STAGE',
};

const VALID_CODES = new Set(SPECIALTIES.map((s) => s.code));
const WHATSAPP_RE = /^\+[1-9]\d{6,14}$/;

const Fields = z.object({
  nom: z.string().trim().min(1),
  prenom: z.string().trim().min(1),
  whatsapp: z.string().trim().regex(WHATSAPP_RE),
  nationalite: z.string().trim().min(1).optional(),
  specialtyCodes: z
    .array(z.string())
    .min(1)
    .refine((codes) => codes.every((c) => VALID_CODES.has(c))),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const { token } = await ctx.params;
    const check = await validateCorrectionToken(token);
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
      whatsapp: form.get('whatsapp'),
      nationalite: form.get('nationalite') ?? undefined,
      specialtyCodes: form.getAll('specialtyCodes'),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request' },
        { status: 400 },
      );
    }

    const { id, reference } = check;
    const data: {
      nom: string;
      prenom: string;
      whatsapp: string;
      nationalite?: string;
      specialtyCodes: string[];
      correctionRequestedAt: null;
      pieceJointeUrl?: string;
    } = {
      nom: parsed.data.nom,
      prenom: parsed.data.prenom,
      whatsapp: parsed.data.whatsapp,
      specialtyCodes: parsed.data.specialtyCodes,
      correctionRequestedAt: null,
    };
    if (parsed.data.nationalite) data.nationalite = parsed.data.nationalite;

    // Replacing the PDF is optional — if the candidate doesn't pick a new
    // one, the previously-submitted piece jointe stays as-is.
    const pdf = form.get('pdf');
    if (pdf instanceof File) {
      const upload = await uploadPublicFile(pdf, `dossiers/${reference}/piece-jointe`, {
        maxBytes: CANDIDATE_DOCUMENT_MAX_BYTES,
      });
      if (!upload.ok) {
        return NextResponse.json(
          { error: upload.error.code, message: 'File upload failed' },
          { status: upload.error.status },
        );
      }
      data.pieceJointeUrl = upload.path;
    }

    await prisma.dossier.update({ where: { id }, data });

    return NextResponse.json({ ok: true });
  });
}
