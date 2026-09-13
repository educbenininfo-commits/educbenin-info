// POST /api/admin/invites — requires "manage" on the Comptes admin module
// (always true for SUPERADMIN; for an ADMIN, only if their permission grid
// grants it). Creates (or resends) an admin back-office invitation. Does NOT
// create a User row yet — see AdminInvite model doc comment in
// schema.prisma for why (Google OAuth's find-by-email linking would
// otherwise let a Gmail invitee log in before confirming).
//
// Only a SUPERADMIN may invite another SUPERADMIN — an ADMIN (whatever their
// own Comptes admin permission) can only send ADMIN/SUPPORT invitations.
//
// GET /api/admin/invites — requires "read" on Comptes admin. Lists
// pending/expired invitations (consumedAt/revokedAt null), for the Comptes
// admin table.
export const runtime = 'nodejs';

import 'server-only';
import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { enqueueOutbox } from '@/lib/server/outbox';
import { drainOutboxNow } from '@/lib/server/outbox/drain-now';
import { zEmail } from '@/lib/server/zod-helpers';

const INVITE_TTL_MS = 10 * 60 * 1000;

const ModulePermissionsSchema = z.object({
  dossiers: z.enum(['manage', 'read', 'none']),
  dossiersRejetes: z.enum(['manage', 'read', 'none']),
  specialites: z.enum(['manage', 'read', 'none']),
  tarifs: z.enum(['manage', 'read', 'none']),
  comptesAdmin: z.enum(['manage', 'read', 'none']),
});

const Body = z.object({
  email: zEmail,
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(['ADMIN', 'SUPERADMIN']),
  adminLabel: z.enum(['ADMIN', 'SUPPORT']).optional(),
  modulePermissions: ModulePermissionsSchema.optional(),
});

function roleLabelFor(role: 'ADMIN' | 'SUPERADMIN', adminLabel?: 'ADMIN' | 'SUPPORT'): string {
  if (role === 'SUPERADMIN') return 'Super administrateur';
  return adminLabel === 'SUPPORT' ? 'Support' : 'Administrateur';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireModulePermission(null, 'comptesAdmin', 'manage');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400 },
      );
    }
    const { email, name, role, adminLabel, modulePermissions } = parsed.data;

    if (role === 'SUPERADMIN' && auth.admin.role !== 'SUPERADMIN') {
      return NextResponse.json(
        {
          error: 'SUPERADMIN_INVITE_REQUIRES_SUPERADMIN',
          message: 'Only a SUPERADMIN can invite another SUPERADMIN.',
        },
        { status: 403 },
      );
    }

    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    const roleLabel = roleLabelFor(role, adminLabel);

    const invite = await prisma.$transaction(async (tx) => {
      // Revoke any still-pending invite for this email — one live invite at
      // a time per address (a resend supersedes the previous link, matching
      // the same "resend invalidates the old link" behavior already used for
      // Dossier auth-send).
      await tx.adminInvite.updateMany({
        where: { email, consumedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });

      const created = await tx.adminInvite.create({
        data: {
          email,
          name: name ?? null,
          role,
          adminLabel: adminLabel ?? null,
          ...(modulePermissions ? { modulePermissions } : {}),
          invitedByUserId: auth.admin.id,
          token,
          expiresAt,
        },
      });

      const link = `${process.env.APP_URL ?? 'http://localhost:3000'}/invitation/${token}`;
      await enqueueOutbox(tx, {
        kind: 'email.admin_invitation',
        payload: { to: email, link, expiresAt: expiresAt.toISOString(), roleLabel },
      });

      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'admin.invite_sent',
        targetType: 'AdminInvite',
        targetId: created.id,
        metadata: { email, name: name ?? null, role, adminLabel: adminLabel ?? null },
      });

      return created;
    });

    // Best-effort immediate send — the scheduled outbox/email-queue crons
    // only run once a day on this project's Vercel plan (see vercel.json),
    // so without this an invitee would wait up to 24h. See drain-now.ts.
    await drainOutboxNow();

    return NextResponse.json(
      { id: invite.id, email: invite.email, expiresAt: invite.expiresAt.toISOString() },
      { status: 201 },
    );
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const auth = await requireModulePermission(null, 'comptesAdmin', 'read');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const invites = await prisma.adminInvite.findMany({
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
    });

    return NextResponse.json({ items: invites });
  });
}
