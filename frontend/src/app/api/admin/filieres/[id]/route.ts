// PATCH /api/admin/filieres/[id] — the École & WhatsApp table's "Modifier"
// action. date/heure/salle only make sense for a "concours_ou_composition"
// Categorie (see schema.prisma's Ecole doc comment) — accepted here
// regardless (the UI only shows those fields for that Categorie type), so
// this route doesn't need to know the type itself.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

// Strips `undefined` entries entirely (not just typed as optional) — a plain
// spread of the Zod .optional() result would otherwise overwrite an existing
// value with `undefined` for any field the caller omitted, and
// exactOptionalPropertyTypes rejects `{ nom: undefined }` against Prisma's
// update input regardless. Same pattern as dossiers/[id]/edit/route.ts.
function definedOnly<T extends object>(obj: T): T {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out as T;
}

const Body = z.object({
  nom: z.string().trim().min(1).max(200).optional(),
  date: z.string().trim().max(120).nullable().optional(),
  heure: z.string().trim().max(60).nullable().optional(),
  salle: z.string().trim().max(120).nullable().optional(),
  lienWhatsapp: z.string().trim().url().nullable().optional(),
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

  const existing = await prisma.filiere.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'FILIERE_NOT_FOUND' }, { status: 404 });
  }

  const data = definedOnly(parsed.data) as Prisma.FiliereUpdateInput;

  const filiere = await prisma.filiere.update({
    where: { id },
    data,
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'filiere.update',
    targetType: 'Filiere',
    targetId: id,
    metadata: parsed.data,
  });

  return NextResponse.json({ filiere });
}
