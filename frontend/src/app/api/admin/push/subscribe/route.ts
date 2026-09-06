// POST /api/admin/push/subscribe — stores a device's Web Push subscription
// so notifyAdmins() (lib/server/push/send.ts) can reach it. Called from
// components/pwa/PushSetup.tsx, only offered while running the installed
// PWA. Upserts by endpoint (unique) so re-subscribing the same device
// after a subscription expired/rotated just updates the keys.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
    }

    const { endpoint, keys } = parsed.data;
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: auth.user.sub },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: auth.user.sub,
        userAgent: req.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ ok: true });
  });
}
