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
    select: { id: true, reference: true, stage: true, authSentAt: true, authSubmittedAt: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: 'DOSSIER_NOT_FOUND' }, { status: 404 });
  }
  if (dossier.stage !== 2) {
    return NextResponse.json({ error: 'WRONG_STAGE' }, { status: 409 });
  }
  // No more hard "already sent" block — an admin can resend at any point
  // while the dossier sits at this stage (e.g. the candidate's browser
  // failed to submit, or a mistake needs correcting). `authFormData` from
  // any prior submission is left untouched so the candidate's next visit
  // pre-fills from it; only `authSubmittedAt` is cleared so the state
  // machine treats this as pending again.
  const isResend = Boolean(dossier.authSentAt);

  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const authTokenExpiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

  await prisma.dossier.update({
    where: { id },
    data: {
      authToken: token,
      authTokenExpiresAt,
      authSentAt: now,
      authSubmittedAt: null,
    },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: isResend ? 'dossier.auth_resend' : 'dossier.auth_send',
    targetType: 'Dossier',
    targetId: id,
    metadata: { reference: dossier.reference },
  });

  return NextResponse.json({ token, authTokenExpiresAt: authTokenExpiresAt.toISOString() });
}
