// GET /api/admin/filieres?ecoleId=X&categorieId=Y|all — the École &
// WhatsApp screen's main table, scoped by the two filter rows (school,
// then category within it).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';

const Query = z.object({
  ecoleId: z.string().trim().min(1),
  categorieId: z.string().trim().default('all'),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireModulePermission(null, 'specialites', 'read');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const url = req.nextUrl;
  const parsed = Query.safeParse({
    ecoleId: url.searchParams.get('ecoleId'),
    categorieId: url.searchParams.get('categorieId') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const { ecoleId, categorieId } = parsed.data;
  const categorieFilter = categorieId === 'all' ? { ecoleId } : { ecoleId, id: categorieId };

  const filieres = await prisma.filiere.findMany({
    where: { categorie: categorieFilter },
    orderBy: [{ categorieId: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      nom: true,
      code: true,
      date: true,
      heure: true,
      salle: true,
      lienWhatsapp: true,
      categorieId: true,
      categorie: { select: { libelle: true, libelleCourt: true, typeAdmission: true } },
    },
  });

  const items = filieres.map((f) => ({
    id: f.id,
    nom: f.nom,
    code: f.code,
    date: f.date,
    heure: f.heure,
    salle: f.salle,
    lienWhatsapp: f.lienWhatsapp,
    categorieId: f.categorieId,
    categorieLabel: f.categorie.libelleCourt ?? f.categorie.libelle,
    typeAdmission: f.categorie.typeAdmission,
  }));

  return NextResponse.json({ items });
}
