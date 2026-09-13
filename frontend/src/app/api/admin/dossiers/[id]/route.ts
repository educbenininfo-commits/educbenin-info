export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin, requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { withSignedFileUrls } from '@/lib/server/dossiers/resolve-file-urls';
import { deleteObject } from '@/lib/server/upload/supabase-storage-client';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const { id } = await ctx.params;
  const dossier = await prisma.dossier.findUnique({
    where: { id },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });
  if (!dossier) {
    return NextResponse.json({ error: 'DOSSIER_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ dossier: await withSignedFileUrls(dossier) });
}

const PatchBody = z.object({
  montant: z.number().int().positive().optional(),
  montantSupplement: z.number().int().nonnegative().nullable().optional(),
  paye: z.number().int().optional(),
  moyen: z.enum(['Non renseigné', 'Mobile Money', 'Espèces', 'Virement']).optional(),
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
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const current = await prisma.dossier.findUnique({
    where: { id },
    select: { montant: true, montantSupplement: true },
  });
  if (!current) {
    return NextResponse.json({ error: 'DOSSIER_NOT_FOUND' }, { status: 404 });
  }

  const { montant, montantSupplement, paye, moyen } = parsed.data;
  const data: Record<string, unknown> = {};
  if (montant !== undefined) data.montant = montant;
  if (montantSupplement !== undefined) data.montantSupplement = montantSupplement;
  if (moyen !== undefined) data.moyen = moyen;

  if (paye !== undefined) {
    const effectiveMontant = montant ?? current.montant;
    const effectiveSupplement =
      montantSupplement !== undefined ? montantSupplement : current.montantSupplement;
    const ceiling = effectiveMontant + (effectiveSupplement ?? 0);
    data.paye = Math.max(0, Math.min(paye, ceiling));
  }

  // `include: comments` keeps the response's `dossier` shape identical to
  // Task 10's GET detail route — the modal (Task 22) sets its whole
  // `dossier` state directly from this response, and a response missing
  // `comments` would wipe the currently-displayed comment list.
  const dossier = await prisma.dossier.update({
    where: { id },
    data,
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.payment_update',
    targetType: 'Dossier',
    targetId: id,
    metadata: data,
  });

  return NextResponse.json({ dossier: await withSignedFileUrls(dossier) });
}

const DeleteBody = z.object({ confirmReference: z.string().trim().min(1) });

// DELETE /api/admin/dossiers/[id] — SUPERADMIN only, irreversible. Requires
// the caller to echo back the dossier's exact reference (the UI's "type to
// confirm" modal enforces this too, but the server never trusts the client
// alone for something this destructive). Best-effort deletes every stored
// file before dropping the row — once the Dossier is gone those files are
// unreachable dead weight against the Supabase free-tier quota anyway.
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;

  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const { id } = await ctx.params;
  const parsed = DeleteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const dossier = await prisma.dossier.findUnique({ where: { id } });
  if (!dossier) {
    return NextResponse.json({ error: 'DOSSIER_NOT_FOUND' }, { status: 404 });
  }
  if (parsed.data.confirmReference !== dossier.reference) {
    return NextResponse.json(
      { error: 'REFERENCE_MISMATCH', message: 'La référence saisie ne correspond pas au dossier.' },
      { status: 400 },
    );
  }

  await Promise.all(
    [
      dossier.pieceJointeUrl,
      dossier.diplomaBacUrl,
      dossier.diplomaDoctoratUrl,
      dossier.diplomaBacTranslatedUrl,
      dossier.diplomaDoctoratTranslatedUrl,
      dossier.ficheUrl,
      dossier.recepisseUrl,
    ].map((path) => deleteObject(path)),
  );

  await prisma.$transaction(async (tx) => {
    await tx.dossierComment.deleteMany({ where: { dossierId: id } });
    await tx.dossier.delete({ where: { id } });
    await logAdminAction(tx, {
      actorId: auth.admin.id,
      action: 'dossier.delete',
      targetType: 'Dossier',
      targetId: id,
      metadata: {
        reference: dossier.reference,
        nom: dossier.nom,
        prenom: dossier.prenom,
        whatsapp: dossier.whatsapp,
        stage: dossier.stage,
        specialtyCodes: dossier.specialtyCodes,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
