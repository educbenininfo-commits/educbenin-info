// PATCH /api/admin/users/[id]/permissions — SUPERADMIN only. Updates the
// per-module permission grid (and/or the cosmetic Admin/Support label) for
// an ADMIN-rank member. Global role changes stay on the existing
// /api/admin/users/[id]/role route — this one only touches modulePermissions
// + adminLabel, both additive fields that don't affect requireAdmin's rank
// check.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireSuperadmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const ModulePermissionsSchema = z.object({
  dossiers: z.enum(['manage', 'read', 'none']),
  dossiersRejetes: z.enum(['manage', 'read', 'none']),
  specialites: z.enum(['manage', 'read', 'none']),
  tarifs: z.enum(['manage', 'read', 'none']),
  comptesAdmin: z.enum(['manage', 'read', 'none']),
});

const Body = z.object({
  adminLabel: z.enum(['ADMIN', 'SUPPORT']).nullable().optional(),
  modulePermissions: ModulePermissionsSchema,
});

export async function PATCH(
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
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, modulePermissions: true, adminLabel: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }
    if (target.role !== 'ADMIN') {
      // SUPERADMIN always has full access — its permission grid is never
      // consulted, so there's nothing meaningful to customize for that role.
      return NextResponse.json(
        {
          error: 'NOT_APPLICABLE',
          message: 'Only ADMIN-rank members have customizable permissions.',
        },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          adminLabel: parsed.data.adminLabel ?? null,
          modulePermissions: parsed.data.modulePermissions,
        },
        select: { id: true, adminLabel: true, modulePermissions: true },
      });
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'user.permissions_change',
        targetType: 'User',
        targetId: id,
        metadata: {
          before: { adminLabel: target.adminLabel, modulePermissions: target.modulePermissions },
          after: { adminLabel: user.adminLabel, modulePermissions: user.modulePermissions },
        },
      });
      return user;
    });

    return NextResponse.json({ user: updated });
  });
}
