// GET/PATCH /api/admin/contact-settings — the site-wide contact e-mail and
// WhatsApp number, edited from the back-office "Contact & messages" screen
// and read everywhere they're displayed (lib/server/site-settings.ts).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { getContactSettings, SITE_SETTINGS_ID } from '@/lib/server/site-settings';

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  return NextResponse.json({ settings: await getContactSettings() });
}

// isPossible (length-plausible) rather than isValid: Bénin moved to 10-digit
// numbers in 2021 and libphonenumber flags the older 8-digit ones (like the
// site's original +229 67 24 98 37) as invalid — rejecting them would make
// the current number impossible to re-save.
const Body = z.object({
  email: z.string().trim().email().max(200),
  whatsapp: z
    .string()
    .trim()
    .refine((v) => parsePhoneNumberFromString(v)?.isPossible() ?? false, 'INVALID_PHONE'),
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

  const email = parsed.data.email.toLowerCase();
  const whatsapp = parsePhoneNumberFromString(parsed.data.whatsapp)!.number;
  const previous = await getContactSettings();

  await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: { id: SITE_SETTINGS_ID, contactEmail: email, contactWhatsapp: whatsapp },
    update: { contactEmail: email, contactWhatsapp: whatsapp },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'site.contact_update',
    targetType: 'SiteSettings',
    targetId: SITE_SETTINGS_ID,
    metadata: { previous, next: { email, whatsapp } },
  });

  return NextResponse.json({ settings: { email, whatsapp } });
}
