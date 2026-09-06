// POST /api/admin/push/unsubscribe — removes a device's Web Push
// subscription (e.g. the admin disabled notifications, or the browser
// invalidated the subscription and PushSetup.tsx re-registers a fresh one).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({ endpoint: z.string().url() });

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

    // Scoped by userId too — a caller can't unsubscribe someone else's device.
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: parsed.data.endpoint, userId: auth.user.sub },
    });

    return NextResponse.json({ ok: true });
  });
}
