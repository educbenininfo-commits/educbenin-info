// GET /api/admin/invites/[token] — public, no auth (this token IS the auth
// mechanism). Validates an invitation link and returns just enough for the
// public /invitation/[token] page to pick the right branch (Gmail vs
// set-password) — never the role or permissions, those only get applied at
// confirm time and aren't the invitee's business to see beforehand.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export type InviteTokenReason = 'invalid' | 'expired' | 'already-consumed';

const REASON_STATUS: Record<InviteTokenReason, number> = {
  invalid: 404,
  expired: 410,
  'already-consumed': 409,
};
const REASON_CODE: Record<InviteTokenReason, string> = {
  invalid: 'INVITE_INVALID',
  expired: 'INVITE_EXPIRED',
  'already-consumed': 'INVITE_ALREADY_CONSUMED',
};

export async function validateInviteToken(
  token: string,
): Promise<
  { valid: true; email: string; isGmail: boolean } | { valid: false; reason: InviteTokenReason }
> {
  const invite = await prisma.adminInvite.findUnique({
    where: { token },
    select: { email: true, expiresAt: true, consumedAt: true, revokedAt: true },
  });
  if (!invite || invite.revokedAt) return { valid: false, reason: 'invalid' };
  if (invite.consumedAt) return { valid: false, reason: 'already-consumed' };
  if (invite.expiresAt.getTime() < Date.now()) return { valid: false, reason: 'expired' };
  const isGmail = /@(gmail|googlemail)\.com$/i.test(invite.email);
  return { valid: true, email: invite.email, isGmail };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const { token } = await ctx.params;
    const result = await validateInviteToken(token);
    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: REASON_CODE[result.reason] },
        { status: REASON_STATUS[result.reason] },
      );
    }
    return NextResponse.json({ valid: true, email: result.email, isGmail: result.isGmail });
  });
}
