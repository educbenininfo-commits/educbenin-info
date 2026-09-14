// GET/POST /api/admin/tarifs — back-office "Tarifs" screen
// (13-backoffice-tarifs-personnalisables.md). Categorie.tarifDepart stays
// the fast read path every public page queries directly; TarifBareme is the
// append-only audit trail (see its doc comment in schema.prisma). "Actif" vs
// "Archivé" is derived at read time from effectiveFrom — never stored.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { verifyCsrf } from '@/lib/server/auth';
import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

export async function GET(): Promise<NextResponse> {
  const auth = await requireModulePermission(null, 'tarifs', 'read');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const [categories, baremes] = await Promise.all([
    prisma.categorie.findMany({
      orderBy: [{ ecoleId: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        libelle: true,
        libelleCourt: true,
        tarifDepart: true,
        ecole: { select: { nom: true } },
      },
    }),
    prisma.tarifBareme.findMany({
      orderBy: { effectiveFrom: 'desc' },
      select: {
        id: true,
        mode: true,
        montants: true,
        montantUnique: true,
        regleSpecialitesAdditionnelles: true,
        effectiveFrom: true,
        createdBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  const history = baremes.map((b, i) => ({
    id: b.id,
    mode: b.mode,
    montants: b.montants,
    montantUnique: b.montantUnique,
    regleSpecialitesAdditionnelles: b.regleSpecialitesAdditionnelles,
    effectiveFrom: b.effectiveFrom.toISOString(),
    createdByLabel: b.createdBy.name ?? b.createdBy.email,
    statut: i === 0 ? 'Actif' : 'Archivé',
  }));

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      ecoleNom: c.ecole.nom,
      libelle: c.libelle,
      libelleCourt: c.libelleCourt,
      tarifDepart: c.tarifDepart,
    })),
    active: history[0] ?? null,
    history,
  });
}

const CreateBody = z
  .object({
    mode: z.enum(['personnalise', 'unique']),
    montants: z.record(z.string(), z.number().int().positive()).optional(),
    montantUnique: z.number().int().positive().optional(),
    regleSpecialitesAdditionnelles: z.string().trim().max(300).optional(),
  })
  .refine(
    (v) =>
      v.mode === 'unique' ? v.montantUnique != null : Object.keys(v.montants ?? {}).length > 0,
    {
      message: 'Montant(s) requis pour le mode sélectionné',
    },
  );

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;

  const auth = await requireModulePermission(null, 'tarifs', 'manage');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const { mode, montants, montantUnique, regleSpecialitesAdditionnelles } = parsed.data;

  const categories = await prisma.categorie.findMany({ select: { id: true } });

  // Zod's .refine() above guarantees these at the JSON-body level but doesn't
  // narrow parsed.data's TS type — re-check here so the rest of this handler
  // works with definite (non-undefined) values, which exactOptionalPropertyTypes
  // requires before they can flow into Prisma's typed inputs.
  let baremeData: Prisma.TarifBaremeCreateInput;
  let montantEntries: { id: string; montant: number }[] = [];
  if (mode === 'unique') {
    if (typeof montantUnique !== 'number') {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'montantUnique requis pour le mode "unique"' },
        { status: 400 },
      );
    }
    baremeData = {
      mode,
      createdBy: { connect: { id: auth.admin.id } },
      montantUnique,
      ...(regleSpecialitesAdditionnelles ? { regleSpecialitesAdditionnelles } : {}),
    };
  } else {
    const missingOrEntries = categories.map((c) => ({ id: c.id, montant: montants?.[c.id] }));
    if (!montants || missingOrEntries.some((e) => e.montant == null)) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Un montant est requis pour chaque catégorie' },
        { status: 400 },
      );
    }
    montantEntries = missingOrEntries as { id: string; montant: number }[];
    baremeData = {
      mode,
      createdBy: { connect: { id: auth.admin.id } },
      montants: montants as Prisma.InputJsonValue,
      ...(regleSpecialitesAdditionnelles ? { regleSpecialitesAdditionnelles } : {}),
    };
  }

  const bareme = await prisma.$transaction(async (tx) => {
    const created = await tx.tarifBareme.create({ data: baremeData });
    if (mode === 'unique' && typeof montantUnique === 'number') {
      await tx.categorie.updateMany({ data: { tarifDepart: montantUnique } });
    } else {
      for (const entry of montantEntries) {
        await tx.categorie.update({
          where: { id: entry.id },
          data: { tarifDepart: entry.montant },
        });
      }
    }
    return created;
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'tarif.update',
    targetType: 'TarifBareme',
    targetId: bareme.id,
    metadata: { mode, montants, montantUnique, regleSpecialitesAdditionnelles },
  });

  return NextResponse.json({ id: bareme.id }, { status: 201 });
}
