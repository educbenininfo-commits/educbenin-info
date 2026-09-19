// PATCH /api/admin/categories/[id] — the École & WhatsApp screen's
// "Pièces à fournir" editor. Scoped to exactly the fields that screen
// exposes (piecesAFournir, piecesLegend) — libelle/tarifDepart/etc. stay
// on their existing dedicated screens (École & WhatsApp's own rename flow,
// the Tarifs screen) rather than being editable from two places.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { verifyCsrf } from '@/lib/server/auth';
import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

function definedOnly<T extends object>(obj: T): T {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out as T;
}

const Body = z.object({
  piecesAFournir: z.array(z.string().trim().min(1)).max(30).optional(),
  piecesLegend: z.string().trim().max(300).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;

  const auth = await requireModulePermission(null, 'specialites', 'manage');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const existing = await prisma.categorie.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'CATEGORIE_NOT_FOUND' }, { status: 404 });
  }

  const data = definedOnly(parsed.data) as Prisma.CategorieUpdateInput;
  if (parsed.data.piecesAFournir !== undefined) {
    data.piecesAFournir = parsed.data.piecesAFournir as Prisma.InputJsonValue;
  }

  const categorie = await prisma.categorie.update({ where: { id }, data });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'categorie.pieces_update',
    targetType: 'Categorie',
    targetId: id,
    metadata: parsed.data,
  });

  return NextResponse.json({ categorie });
}
