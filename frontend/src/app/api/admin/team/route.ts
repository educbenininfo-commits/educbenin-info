// GET /api/admin/team — Comptes admin & rôles screen. Merges active
// back-office members (role ADMIN/SUPERADMIN) with pending/expired
// invitations into one list, since the table shows both side by side
// ("En attente" / "Expirée" rows alongside real members). Requires "read" on
// the Comptes admin module (always true for SUPERADMIN; for an ADMIN, only
// if their permission grid grants it) — otherwise an ADMIN who's allowed to
// send invites (POST /api/admin/invites) couldn't even load this page.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { prisma } from '@/lib/server/prisma';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const auth = await requireModulePermission(null, 'comptesAdmin', 'read');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const [members, invites] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
        orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminLabel: true,
          modulePermissions: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.adminInvite.findMany({
        where: { consumedAt: null, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminLabel: true,
          modulePermissions: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ]);

    const now = Date.now();
    const pendingInvites = invites.map((inv) => ({
      inviteId: inv.id,
      email: inv.email,
      name: inv.name,
      role: inv.role,
      adminLabel: inv.adminLabel,
      modulePermissions: inv.modulePermissions,
      status: inv.expiresAt.getTime() < now ? ('EXPIRED' as const) : ('PENDING' as const),
      expiresAt: inv.expiresAt.toISOString(),
    }));

    return NextResponse.json({
      members: members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
      pendingInvites,
    });
  });
}
