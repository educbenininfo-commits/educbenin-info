export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

export async function POST(
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
  const dossier = await prisma.dossier.findUnique({
    where: { id },
    select: { id: true, reference: true, stage: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: 'DOSSIER_NOT_FOUND' }, { status: 404 });
  }
  if (dossier.stage < 1 || dossier.stage > 4) {
    return NextResponse.json({ error: 'WRONG_STAGE' }, { status: 409 });
  }

  const nextStage = Math.min(dossier.stage + 1, 5);
  // `include: comments` — see Task 11's identical note.
  const updated = await prisma.dossier.update({
    where: { id },
    data: { stage: nextStage, stageChangedAt: new Date() },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.advance',
    targetType: 'Dossier',
    targetId: id,
    metadata: { reference: dossier.reference, previousStage: dossier.stage, newStage: nextStage },
  });

  return NextResponse.json({ dossier: updated });
}
