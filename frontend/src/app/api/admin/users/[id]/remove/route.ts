// POST /api/admin/users/[id]/remove — SUPERADMIN only. "Supprimer un membre"
// from the back-office team.
//
// This is NOT `DELETE FROM User`: AdminAction.actorId has an onDelete:
// Restrict foreign key, so hard-deleting anyone who has ever taken an
// audited action would fail (and destroying their audit trail would be
// wrong even if it didn't fail — audit history must survive the actor's
// removal). Instead this fully revokes back-office access: role drops to
// USER, admin-only fields are cleared, the password is cleared, all
// sessions/OAuth links are severed, and tokenVersion is bumped so any live
// JWT is rejected immediately. The row then simply falls out of the
// Comptes admin list (which filters on role IN (ADMIN, SUPERADMIN)).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { verifyCsrf } from '@/lib/server/auth';
import { requireSuperadmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { isProtectedSuperadmin } from '@/lib/server/admin/protected-accounts';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

type Discriminator =
  | { kind: 'NOT_FOUND' }
  | { kind: 'LAST_SUPERADMIN' }
  | { kind: 'PROTECTED_ACCOUNT' }
  | { kind: 'OK' };

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id } = await ctx.params;

    const result: Discriminator = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { id: true, role: true, email: true, name: true, adminLabel: true },
      });
      if (!target) return { kind: 'NOT_FOUND' as const };

      // The founder/owner account can never be removed, by anyone.
      if (isProtectedSuperadmin(target.email)) {
        return { kind: 'PROTECTED_ACCOUNT' as const };
      }

      // Same last-SUPERADMIN guard as the role-change route (removal is
      // functionally a demotion to USER).
      if (target.role === 'SUPERADMIN') {
        const superadminCount = await tx.user.count({ where: { role: 'SUPERADMIN' } });
        if (superadminCount <= 1) return { kind: 'LAST_SUPERADMIN' as const };
      }

      await tx.user.update({
        where: { id },
        data: {
          role: 'USER',
          status: 'SUSPENDED',
          adminLabel: null,
          modulePermissions: Prisma.DbNull,
          passwordHash: null,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.oAuthAccount.deleteMany({ where: { userId: id } });
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'user.remove_from_backoffice',
        targetType: 'User',
        targetId: id,
        metadata: {
          email: target.email,
          name: target.name,
          previousRole: target.role,
          previousAdminLabel: target.adminLabel,
        },
      });

      return { kind: 'OK' as const };
    });

    if (result.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }
    if (result.kind === 'LAST_SUPERADMIN') {
      return NextResponse.json(
        { error: 'LAST_SUPERADMIN', message: 'Refuse to remove the last SUPERADMIN.' },
        { status: 409 },
      );
    }
    if (result.kind === 'PROTECTED_ACCOUNT') {
      return NextResponse.json(
        { error: 'PROTECTED_ACCOUNT', message: 'This account can never be removed.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  });
}
