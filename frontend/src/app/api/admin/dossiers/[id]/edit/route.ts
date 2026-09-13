// Makes the back-office "Modifier" button do something — internal
// corrections to a dossier's own fields and/or the candidate's submitted
// authentification-diplôme answers, without going through the
// candidate-facing resend flow. Every edit is logged with a full
// before/after diff via logAdminAction so it shows up in the dossier's
// "Historique" tab (GET /api/admin/audit-log?targetType=Dossier&targetId=…).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { withSignedFileUrls } from '@/lib/server/dossiers/resolve-file-urls';
import type { AuthForm } from '@/lib/dossiers-data';

const InstitutionPatch = z
  .object({
    institution: z.string().trim().min(1),
    email: z.string().trim().email(),
    annee: z.string().trim().min(1),
    pays: z.string().trim().min(1),
    adresse: z.string().trim().min(1),
  })
  .partial();

const Body = z.object({
  nom: z.string().trim().min(1).optional(),
  prenom: z.string().trim().min(1).optional(),
  whatsapp: z.string().trim().min(1).optional(),
  nationalite: z.string().trim().min(1).optional(),
  specialtyCodes: z.array(z.string()).min(1).optional(),
  authFormData: z
    .object({
      nom: z.string().trim().min(1),
      prenom: z.string().trim().min(1),
      naissance: z.string().trim().min(1),
      lieuNaissance: z.string().trim().min(1),
      nationalite: z.string().trim().min(1),
      adresse: z.string().trim().min(1),
      piece: z.string().trim().min(1),
      pieceRef: z.string().trim().min(1),
      email: z.string().trim().email(),
      tel: z.string().trim().min(1),
      bac: InstitutionPatch,
      doctorat: InstitutionPatch,
    })
    .partial()
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;

  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const current = await prisma.dossier.findUnique({
    where: { id },
    select: {
      nom: true,
      prenom: true,
      whatsapp: true,
      nationalite: true,
      specialtyCodes: true,
      authFormData: true,
    },
  });
  if (!current) {
    return NextResponse.json({ error: 'DOSSIER_NOT_FOUND' }, { status: 404 });
  }

  const { authFormData: authFormPatch, ...topLevel } = parsed.data;

  // Only assign keys the caller actually sent — exactOptionalPropertyTypes
  // rejects `{ nom: undefined }` against Prisma's update input, and (more
  // importantly) a plain spread would overwrite an existing value with
  // `undefined` for any field the caller omitted.
  // Strips `undefined` entries entirely (not just typed as optional) — a
  // plain spread of a Zod .partial() result would otherwise overwrite an
  // existing value with `undefined` for any field the caller omitted, and
  // exactOptionalPropertyTypes rejects `{ nom: undefined }` against
  // Prisma's update input regardless. The cast is safe because the loop
  // guarantees no `undefined` value survives into the returned object.
  function definedOnly<T extends object>(obj: T): T {
    const out: Partial<T> = {};
    for (const key of Object.keys(obj) as (keyof T)[]) {
      if (obj[key] !== undefined) out[key] = obj[key];
    }
    return out as T;
  }

  const data = definedOnly(topLevel) as Prisma.DossierUpdateInput;

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const key of Object.keys(data) as (keyof typeof topLevel)[]) {
    before[key] = current[key as keyof typeof current];
    after[key] = topLevel[key];
  }

  if (authFormPatch && current.authFormData) {
    const existing = current.authFormData as AuthForm;
    const merged: AuthForm = {
      ...existing,
      ...(definedOnly(authFormPatch) as Partial<AuthForm>),
      bac: {
        ...existing.bac,
        ...(definedOnly(authFormPatch.bac ?? {}) as Partial<AuthForm['bac']>),
      },
      doctorat: {
        ...existing.doctorat,
        ...(definedOnly(authFormPatch.doctorat ?? {}) as Partial<AuthForm['doctorat']>),
      },
    };
    data.authFormData = merged as unknown as Prisma.InputJsonValue;
    before.authFormData = existing;
    after.authFormData = merged;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'VALIDATION_FAILED', message: 'Nothing to update' },
      { status: 400 },
    );
  }

  const updated = await prisma.dossier.update({
    where: { id },
    data,
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.edit',
    targetType: 'Dossier',
    targetId: id,
    metadata: { before, after },
  });

  return NextResponse.json({ dossier: await withSignedFileUrls(updated) });
}
