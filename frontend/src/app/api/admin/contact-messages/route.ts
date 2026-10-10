// GET /api/admin/contact-messages — the back-office inbox for messages sent
// from the public /contact form, with status filter/counts and search.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';

const Query = z.object({
  statut: z.enum(['all', 'nouveau', 'lu', 'traite']).default('all'),
  q: z.string().trim().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const parsed = Query.safeParse({
    statut: req.nextUrl.searchParams.get('statut') ?? undefined,
    q: req.nextUrl.searchParams.get('q') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const { statut, q } = parsed.data;

  const searchWhere = q
    ? {
        OR: [
          { nom: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { telephone: { contains: q } },
          { sujet: { contains: q, mode: 'insensitive' as const } },
          { message: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const where = { ...(statut === 'all' ? {} : { statut }), ...searchWhere };

  const [items, grouped] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.contactMessage.groupBy({ by: ['statut'], _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = { all: 0, nouveau: 0, lu: 0, traite: 0 };
  for (const row of grouped) {
    counts[row.statut] = row._count._all;
    counts.all = (counts.all ?? 0) + row._count._all;
  }

  return NextResponse.json({ items, counts });
}
