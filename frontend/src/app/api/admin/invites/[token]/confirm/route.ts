// POST /api/admin/invites/[token]/confirm — public, no auth (the token IS
// the auth mechanism, same as Dossier auth-form). Two branches on the SAME
// endpoint, distinguished by the invited email's domain:
//   - Gmail/Googlemail: no body needed. Confirms only — the invitee then
//     signs in via "Se connecter avec Google", which finds this now-existing
//     User row by email (see AdminInvite schema doc comment).
//   - Anything else: body { password }, validated with the exact same
//     policy as signup (banned-list, min length, optional HIBP), and
//     persisted as passwordHash.
// In both branches this is the ONLY place a User row backing an invite gets
// created/promoted — never at invite-send time (see schema.prisma comment
// on AdminInvite for why).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { hashPassword } from '@/lib/server/auth';
import { isBanned } from '@/lib/server/auth/banned-passwords';
import { isPwned } from '@/lib/server/auth/hibp';
import { logAdminAction } from '@/lib/server/admin/audit';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { validateInviteToken } from '../route';

const PASSWORD_MIN = Number(process.env.AUTH_PASSWORD_MIN_LENGTH ?? 10);

const Body = z.object({ password: z.string().optional() });

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const { token } = await ctx.params;
    const check = await validateInviteToken(token);
    if (!check.valid) {
      const status = check.reason === 'invalid' ? 404 : check.reason === 'expired' ? 410 : 409;
      return NextResponse.json(
        { error: check.reason === 'invalid' ? 'INVITE_INVALID' : check.reason.toUpperCase() },
        { status },
      );
    }

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
    }

    if (!check.isGmail) {
      const password = parsed.data.password ?? '';
      if (isBanned(password)) {
        return NextResponse.json(
          { error: 'PASSWORD_BANNED', message: 'This password is too common.' },
          { status: 400 },
        );
      }
      if (password.length < PASSWORD_MIN) {
        return NextResponse.json(
          {
            error: 'PASSWORD_TOO_SHORT',
            message: `Password must be at least ${PASSWORD_MIN} characters`,
          },
          { status: 400 },
        );
      }
      if (process.env.PASSWORD_HIBP_CHECK === '1' && (await isPwned(password))) {
        return NextResponse.json(
          { error: 'PASSWORD_PWNED', message: 'This password appeared in a known data breach.' },
          { status: 400 },
        );
      }
    }

    const passwordHash = check.isGmail ? null : await hashPassword(parsed.data.password!);

    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch inside the tx to close the TOCTOU window between the GET
      // check above and this write (a second confirm attempt racing this one).
      const invite = await tx.adminInvite.findUnique({ where: { token } });
      if (!invite || invite.revokedAt || invite.consumedAt) {
        return { kind: 'RACE_LOST' as const };
      }
      if (invite.expiresAt.getTime() < Date.now()) {
        return { kind: 'RACE_LOST' as const };
      }

      const invitePerms =
        invite.modulePermissions === null
          ? Prisma.DbNull
          : (invite.modulePermissions as Prisma.InputJsonValue);
      const existing = await tx.user.findUnique({ where: { email: invite.email } });
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              role: invite.role,
              adminLabel: invite.adminLabel,
              modulePermissions: invitePerms,
              status: 'ACTIVE',
              ...(invite.name ? { name: invite.name } : {}),
              ...(passwordHash ? { passwordHash } : {}),
            },
          })
        : await tx.user.create({
            data: {
              email: invite.email,
              name: invite.name,
              role: invite.role,
              adminLabel: invite.adminLabel,
              modulePermissions: invitePerms,
              passwordHash,
              emailVerifiedAt: new Date(),
            },
          });

      await tx.adminInvite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date() },
      });

      await logAdminAction(tx, {
        actorId: user.id,
        action: 'admin.invite_confirmed',
        targetType: 'User',
        targetId: user.id,
        metadata: { email: invite.email, role: invite.role, viaGoogle: check.isGmail },
      });

      return { kind: 'OK' as const, isGmail: check.isGmail };
    });

    if (result.kind === 'RACE_LOST') {
      return NextResponse.json({ error: 'INVITE_ALREADY_CONSUMED' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, isGmail: result.isGmail });
  });
}
