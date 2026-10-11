// GET/PATCH /api/admin/profile — the logged-in team member's own profile for
// the back-office "Paramètres" screen: display name (editable), login e-mail
// and role (read-only here — e-mail is the login identity, role changes go
// through "Comptes admin & rôles"), plus account creation date.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

const PROFILE_SELECT = { name: true, email: true, role: true, createdAt: true } as const;

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const profile = await prisma.user.findUnique({
    where: { id: auth.admin.id },
    select: PROFILE_SELECT,
  });
  if (!profile) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ profile });
}

const Body = z.object({
  name: z.string().trim().max(80),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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
  const name = parsed.data.name || null;

  const previous = await prisma.user.findUnique({
    where: { id: auth.admin.id },
    select: { name: true },
  });
  const profile = await prisma.user.update({
    where: { id: auth.admin.id },
    data: { name },
    select: PROFILE_SELECT,
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'admin.profile_update',
    targetType: 'User',
    targetId: auth.admin.id,
    metadata: { previous: { name: previous?.name ?? null }, next: { name } },
  });

  return NextResponse.json({ profile });
}
