export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';

const ACTIVITY_WINDOW = 50;
const ACTIVITY_LIMIT = 10;
const STALE_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000;

interface ActivityEvent {
  dossierId: string;
  reference: string;
  label: string;
  at: Date;
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const fiveDaysAgo = new Date(Date.now() - STALE_THRESHOLD_MS);

  const [grouped, enAttente, recentWindow] = await Promise.all([
    prisma.dossier.groupBy({ by: ['stage'], _count: { _all: true } }),
    prisma.dossier.findMany({
      where: { stage: { gte: 1, lte: 4 }, stageChangedAt: { lt: fiveDaysAgo } },
      orderBy: { stageChangedAt: 'asc' },
      select: {
        id: true,
        reference: true,
        nom: true,
        prenom: true,
        stage: true,
        stageChangedAt: true,
      },
    }),
    prisma.dossier.findMany({
      orderBy: { updatedAt: 'desc' },
      take: ACTIVITY_WINDOW,
      select: {
        id: true,
        reference: true,
        createdAt: true,
        authSubmittedAt: true,
        stageChangedAt: true,
      },
    }),
  ]);

  const kpis: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const row of grouped) {
    if (row.stage >= 0 && row.stage <= 5) kpis[String(row.stage)] = row._count._all;
  }

  const events: ActivityEvent[] = [];
  for (const d of recentWindow) {
    events.push({
      dossierId: d.id,
      reference: d.reference,
      label: 'Nouveau dossier reçu',
      at: d.createdAt,
    });
    if (d.authSubmittedAt) {
      events.push({
        dossierId: d.id,
        reference: d.reference,
        label: "Formulaire d'authentification reçu",
        at: d.authSubmittedAt,
      });
    }
    if (d.stageChangedAt.getTime() !== d.createdAt.getTime()) {
      events.push({
        dossierId: d.id,
        reference: d.reference,
        label: 'Statut modifié',
        at: d.stageChangedAt,
      });
    }
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  return NextResponse.json({
    kpis,
    enAttente,
    activiteRecente: events.slice(0, ACTIVITY_LIMIT),
  });
}
