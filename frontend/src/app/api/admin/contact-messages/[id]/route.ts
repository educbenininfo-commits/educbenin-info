// PATCH /api/admin/contact-messages/[id] — updates a contact message's
// statut (nouveau → lu → traité) from the back-office inbox.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

const Body = z.object({ statut: z.enum(['nouveau', 'lu', 'traite']) });

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

  const existing = await prisma.contactMessage.findUnique({
    where: { id },
    select: { statut: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'CONTACT_MESSAGE_NOT_FOUND' }, { status: 404 });
  }

  const contactMessage = await prisma.contactMessage.update({
    where: { id },
    data: { statut: parsed.data.statut },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'contact_message.status_update',
    targetType: 'ContactMessage',
    targetId: id,
    metadata: { previousStatut: existing.statut, newStatut: parsed.data.statut },
  });

  return NextResponse.json({ contactMessage });
}
