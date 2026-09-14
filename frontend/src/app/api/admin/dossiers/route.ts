export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';

const Query = z.object({
  stage: z.enum(['all', '0', '1', '2', '3', '4', '5']).default('all'),
  // 'all' or an Ecole.id — 10-backoffice-dossiers.md's new top filter row.
  ecoleId: z.string().default('all'),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const url = new URL(req.url);
  const parsed = Query.safeParse({
    stage: url.searchParams.get('stage') ?? undefined,
    ecoleId: url.searchParams.get('ecoleId') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const stageFilter = parsed.data.stage;
  const ecoleFilter = parsed.data.ecoleId === 'all' ? {} : { ecoleId: parsed.data.ecoleId };
  const where = {
    ...(stageFilter === 'all' ? { stage: { gte: 1 } } : { stage: Number(stageFilter) }),
    ...ecoleFilter,
  };

  const [items, stageGrouped, ecoles, ecoleGrouped] = await Promise.all([
    prisma.dossier.findMany({
      where,
      orderBy: [{ stageChangedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        reference: true,
        nom: true,
        prenom: true,
        whatsapp: true,
        nationalite: true,
        specialtyCodes: true,
        stage: true,
        stageChangedAt: true,
        motifRejet: true,
        correctionRequestedAt: true,
        ecoleId: true,
        ecole: { select: { nom: true } },
        categorieId: true,
        categorie: { select: { libelle: true, libelleCourt: true } },
      },
    }),
    // Stage counts — scoped to the selected école, so switching the top
    // filter row recalculates them (10: "recalcule les compteurs des
    // filtres par étape juste en dessous").
    prisma.dossier.groupBy({
      by: ['stage'],
      where: { ...ecoleFilter, stage: { gte: 1 } },
      _count: { _all: true },
    }),
    prisma.ecole.findMany({ select: { id: true, nom: true }, orderBy: { createdAt: 'asc' } }),
    // École chip counts — always each école's own total, independent of
    // which chip is currently selected (that's how you switch between them).
    prisma.dossier.groupBy({
      by: ['ecoleId'],
      where: { stage: { gte: 1 } },
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = { all: 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let allTotal = 0;
  for (const row of stageGrouped) {
    if (row.stage >= 1 && row.stage <= 5) {
      counts[String(row.stage)] = row._count._all;
      allTotal += row._count._all;
    }
  }
  counts.all = allTotal;

  const ecoleCountById = new Map(ecoleGrouped.map((r) => [r.ecoleId, r._count._all]));
  const ecoleCounts = {
    all: ecoleGrouped.reduce((sum, r) => sum + r._count._all, 0),
    ...Object.fromEntries(ecoles.map((e) => [e.id, ecoleCountById.get(e.id) ?? 0])),
  };

  const mappedItems = items.map((d) => ({
    id: d.id,
    reference: d.reference,
    nom: d.nom,
    prenom: d.prenom,
    whatsapp: d.whatsapp,
    nationalite: d.nationalite,
    specialtyCodes: d.specialtyCodes,
    stage: d.stage,
    stageChangedAt: d.stageChangedAt,
    motifRejet: d.motifRejet,
    correctionRequestedAt: d.correctionRequestedAt,
    ecoleId: d.ecoleId,
    ecoleNom: d.ecole.nom,
    categorieId: d.categorieId,
    categorieLabel: d.categorie.libelleCourt ?? d.categorie.libelle,
  }));

  return NextResponse.json({ items: mappedItems, counts, ecoles, ecoleCounts });
}
