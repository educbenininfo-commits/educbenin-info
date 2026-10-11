// GET/PATCH /api/admin/site-display — site-wide display settings for the
// public site, edited from the back-office Paramètres screen (currently the
// mobile menu placement: bottom bar, or ☰ at the top left / top right).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { getDisplaySettings, SITE_SETTINGS_ID } from '@/lib/server/site-settings';
import { PUBLIC_NAV_MODES } from '@/lib/public-nav-mode';

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  return NextResponse.json({ settings: await getDisplaySettings() });
}

const Body = z.object({
  publicNavMode: z.enum(PUBLIC_NAV_MODES as [string, ...string[]]),
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
  const { publicNavMode } = parsed.data;
  const previous = await getDisplaySettings();

  await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: { id: SITE_SETTINGS_ID, publicNavMode },
    update: { publicNavMode },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'site.display_update',
    targetType: 'SiteSettings',
    targetId: SITE_SETTINGS_ID,
    metadata: { previous, next: { publicNavMode } },
  });

  return NextResponse.json({ settings: { publicNavMode } });
}
