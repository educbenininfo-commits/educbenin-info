export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';

const Query = z.object({
  stage: z.enum(['all', '0', '1', '2', '3', '4', '5']).default('all'),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const url = new URL(req.url);
  const parsed = Query.safeParse({ stage: url.searchParams.get('stage') ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const stageFilter = parsed.data.stage;
  const where = stageFilter === 'all' ? { stage: { gte: 1 } } : { stage: Number(stageFilter) };

  const [items, grouped] = await Promise.all([
    prisma.dossier.findMany({
      where,
      orderBy: [{ stageChangedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        reference: true,
        nom: true,
        prenom: true,
        whatsapp: true,
        specialtyCodes: true,
        stage: true,
        stageChangedAt: true,
        motifRejet: true,
      },
    }),
    prisma.dossier.groupBy({ by: ['stage'], _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = { all: 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let allTotal = 0;
  for (const row of grouped) {
    if (row.stage >= 1 && row.stage <= 5) {
      counts[String(row.stage)] = row._count._all;
      allTotal += row._count._all;
    }
  }
  counts.all = allTotal;

  return NextResponse.json({ items, counts });
}
