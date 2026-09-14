// GET/POST /api/admin/ecoles — back-office "École & WhatsApp" screen
// (11-backoffice-ecole-whatsapp.md), the admin surface of the same
// Ecole/Categorie/Filiere model every public page reads. Reuses the
// existing "specialites" module-permission key (module renamed in the UI
// from "Spécialités & WhatsApp" — see admin-team-api.ts's MODULE_LABELS —
// but the permission grid itself isn't re-plumbed).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';

export async function GET(): Promise<NextResponse> {
  const auth = await requireModulePermission(null, 'specialites', 'read');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const ecoles = await prisma.ecole.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      nom: true,
      description: true,
      lienWhatsappGeneral: true,
      categories: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, libelle: true, libelleCourt: true, typeAdmission: true },
      },
    },
  });

  return NextResponse.json({ items: ecoles });
}

const CreateBody = z.object({
  nom: z.string().trim().min(1).max(60),
  lienWhatsappGeneral: z.string().trim().url().optional(),
});

// "+ Ajouter une école" — 11-backoffice-ecole-whatsapp.md: the new school
// must appear immediately in the public nav dropdown, /ecoles, and this
// screen's own filter row with no further development — all of them
// already read live from the Ecole table, so a plain insert is sufficient.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;

  const auth = await requireModulePermission(null, 'specialites', 'manage');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const ecole = await prisma.ecole.create({
    data: {
      nom: parsed.data.nom,
      lienWhatsappGeneral: parsed.data.lienWhatsappGeneral ?? null,
    },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'ecole.create',
    targetType: 'Ecole',
    targetId: ecole.id,
    metadata: { nom: ecole.nom },
  });

  return NextResponse.json({ ecole }, { status: 201 });
}
