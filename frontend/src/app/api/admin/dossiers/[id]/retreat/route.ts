// Mirror of advance/route.ts — moves a dossier back to the previous stage.
// Lets staff undo an accidental "faire passer à l'étape suivante" click, or
// step a dossier back if something turns out to be missing after all.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { withSignedFileUrls } from '@/lib/server/dossiers/resolve-file-urls';

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
  // Never from stage 0 (rejeté — use "restaurer" instead) and never below
  // stage 1 (the first real stage).
  if (dossier.stage <= 1) {
    return NextResponse.json({ error: 'WRONG_STAGE' }, { status: 409 });
  }

  const previousStage = Math.max(dossier.stage - 1, 1);
  const updated = await prisma.dossier.update({
    where: { id },
    data: { stage: previousStage, stageChangedAt: new Date() },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.retreat',
    targetType: 'Dossier',
    targetId: id,
    metadata: {
      reference: dossier.reference,
      previousStage: dossier.stage,
      newStage: previousStage,
    },
  });

  return NextResponse.json({ dossier: await withSignedFileUrls(updated) });
}
