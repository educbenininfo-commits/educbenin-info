// POST /api/admin/dossiers/[id]/send-correction — the "renvoyer pour
// correction" action: an admin flags that something on the dossier's
// current-stage form needs fixing (rejected dossier, a comment asking for
// a change, a badly-filled field) and sends the candidate back to a
// pre-filled version of whichever form matches the stage they're at —
// Demande at stage 1 (via a new token-gated public page), Authentification
// at stage 2 (reuses the existing auth-token regeneration). Never creates a
// new dossier — the same row gets updated in place, flagged
// `correctionRequestedAt` so the back-office list can show a "Dossier MAJ"
// pill until the candidate resubmits (which clears the flag).
export const runtime = 'nodejs';

import 'server-only';
import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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
  if (dossier.stage !== 1 && dossier.stage !== 2) {
    return NextResponse.json({ error: 'WRONG_STAGE' }, { status: 409 });
  }

  const now = new Date();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

  let publicUrlPath: string;
  if (dossier.stage === 2) {
    // Same mechanism as auth-send/route.ts's resend — one link, one form.
    await prisma.dossier.update({
      where: { id },
      data: {
        authToken: token,
        authTokenExpiresAt: expiresAt,
        authSentAt: now,
        authSubmittedAt: null,
        correctionRequestedAt: now,
      },
    });
    publicUrlPath = `/authentification-diplome/${token}`;
  } else {
    await prisma.dossier.update({
      where: { id },
      data: {
        correctionToken: token,
        correctionTokenExpiresAt: expiresAt,
        correctionRequestedAt: now,
      },
    });
    publicUrlPath = `/corriger-ma-demande/${token}`;
  }

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.correction_send',
    targetType: 'Dossier',
    targetId: id,
    metadata: { reference: dossier.reference, stage: dossier.stage },
  });

  return NextResponse.json({ path: publicUrlPath, expiresAt: expiresAt.toISOString() });
}
