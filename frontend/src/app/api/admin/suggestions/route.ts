// GET /api/admin/suggestions — back-office "Suggestions" screen
// (12-backoffice-suggestions.md). Lists the Suggestion rows created by the
// public "Suggérer" forms (home page + École — INMeS), with status
// filter/counts, free-text search, and sort.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';

const Query = z.object({
  statut: z.enum(['all', 'nouveau', 'vu', 'a_ajouter', 'refuse']).default('all'),
  q: z.string().trim().optional(),
  sort: z.enum(['date', 'statut']).default('date'),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const url = req.nextUrl;
  const parsed = Query.safeParse({
    statut: url.searchParams.get('statut') ?? undefined,
    q: url.searchParams.get('q') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const { statut, q, sort } = parsed.data;

  const searchWhere = q
    ? {
        OR: [
          { nom: { contains: q, mode: 'insensitive' as const } },
          { contact: { contains: q, mode: 'insensitive' as const } },
          { recherche: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const where = { ...(statut === 'all' ? {} : { statut }), ...searchWhere };

  const [items, grouped] = await Promise.all([
    prisma.suggestion.findMany({
      where,
      orderBy:
        sort === 'statut' ? [{ statut: 'asc' }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }],
    }),
    prisma.suggestion.groupBy({ by: ['statut'], _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = { all: 0, nouveau: 0, vu: 0, a_ajouter: 0, refuse: 0 };
  let total = 0;
  for (const row of grouped) {
    counts[row.statut] = row._count._all;
    total += row._count._all;
  }
  counts.all = total;

  return NextResponse.json({ items, counts });
}
