export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export type AuthTokenReason = 'invalid' | 'expired' | 'already-submitted' | 'wrong-stage';

export async function validateAuthToken(
  token: string,
): Promise<{ valid: true; reference: string } | { valid: false; reason: AuthTokenReason }> {
  const dossier = await prisma.dossier.findUnique({
    where: { authToken: token },
    select: { reference: true, stage: true, authTokenExpiresAt: true, authSubmittedAt: true },
  });
  if (!dossier) return { valid: false, reason: 'invalid' };
  if (!dossier.authTokenExpiresAt || dossier.authTokenExpiresAt.getTime() < Date.now()) {
    return { valid: false, reason: 'expired' };
  }
  if (dossier.authSubmittedAt) return { valid: false, reason: 'already-submitted' };
  if (dossier.stage !== 2) return { valid: false, reason: 'wrong-stage' };
  return { valid: true, reference: dossier.reference };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const { token } = await ctx.params;
    const result = await validateAuthToken(token);
    return NextResponse.json(result);
  });
}
