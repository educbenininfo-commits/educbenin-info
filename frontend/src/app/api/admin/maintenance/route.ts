// GET/POST /api/admin/maintenance — the Tableau de bord's "mode maintenance"
// toggle. SUPERADMIN only: this takes the entire public site down for every
// visitor, so it isn't gated behind the regular per-module permission grid
// like Dossiers/Tarifs/etc. — it's a blast-radius decision, not a workflow one.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { getMaintenanceEnabled, setMaintenanceEnabled } from '@/lib/server/maintenance';

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const enabled = await getMaintenanceEnabled();
  return NextResponse.json({ enabled });
}

const Body = z.object({ enabled: z.boolean() });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;

  const auth = await requireAdmin('SUPERADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  await setMaintenanceEnabled(parsed.data.enabled);

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'site.maintenance_toggle',
    targetType: 'Site',
    targetId: 'maintenance',
    metadata: { enabled: parsed.data.enabled },
  });

  return NextResponse.json({ enabled: parsed.data.enabled });
}
