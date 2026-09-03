export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

const Body = z.object({
  type: z.enum(['public', 'internal']),
  text: z.string().trim().min(1),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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

  const { id } = await ctx.params;
  const dossier = await prisma.dossier.findUnique({ where: { id }, select: { id: true } });
  if (!dossier) {
    return NextResponse.json({ error: 'DOSSIER_NOT_FOUND' }, { status: 404 });
  }

  const comment = await prisma.dossierComment.create({
    data: {
      dossierId: id,
      type: parsed.data.type,
      text: parsed.data.text,
      authorName: auth.admin.email,
    },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.comment_add',
    targetType: 'Dossier',
    targetId: id,
    metadata: { type: parsed.data.type },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
