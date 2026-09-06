export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { withSignedFileUrls } from '@/lib/server/dossiers/resolve-file-urls';

const Body = z.object({ motif: z.string().trim().min(1) });

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

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

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

  // `include: comments` — see Task 11's identical note: the modal (Task 22)
  // sets its `dossier` state straight from this response.
  const updated = await prisma.dossier.update({
    where: { id },
    data: { stage: 0, motifRejet: parsed.data.motif, stageChangedAt: new Date() },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.reject',
    targetType: 'Dossier',
    targetId: id,
    metadata: {
      reference: dossier.reference,
      previousStage: dossier.stage,
      motif: parsed.data.motif,
    },
  });

  return NextResponse.json({ dossier: await withSignedFileUrls(updated) });
}
