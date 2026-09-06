export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { withSignedFileUrls } from '@/lib/server/dossiers/resolve-file-urls';

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
