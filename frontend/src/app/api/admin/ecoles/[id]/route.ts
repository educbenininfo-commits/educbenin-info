// PATCH /api/admin/ecoles/[id] — "Enregistrer et propager" on the École &
// WhatsApp screen's general WhatsApp link editor. Every public page reads
// Ecole.lienWhatsappGeneral live, so this takes effect immediately with no
// separate propagation step.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

const Body = z.object({
  lienWhatsappGeneral: z.string().trim().url(),
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

  const existing = await prisma.ecole.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'ECOLE_NOT_FOUND' }, { status: 404 });
  }

  const ecole = await prisma.ecole.update({
    where: { id },
    data: { lienWhatsappGeneral: parsed.data.lienWhatsappGeneral },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'ecole.whatsapp_update',
    targetType: 'Ecole',
    targetId: id,
    metadata: { nom: ecole.nom, lienWhatsappGeneral: ecole.lienWhatsappGeneral },
  });

  return NextResponse.json({ ecole });
}
