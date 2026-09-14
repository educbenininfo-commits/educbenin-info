// Shared read queries for the public multi-school pages (/ecoles,
// /fss, /inmes, /accompagnement, and the per-category demand-form
// screens). Centralized so every screen reads the same shape from
// Ecole/Categorie/Filiere rather than each page writing its own Prisma
// query — a school/category/filière added via the back-office is picked
// up by every consumer with no per-page change.
import 'server-only';
import { prisma } from '@/lib/server/prisma';

export interface EcoleForGrid {
  id: string;
  nom: string;
  description: string | null;
  categories: {
    id: string;
    libelle: string;
    description: string | null;
    tarifDepart: number | null;
    _count: { filieres: number };
  }[];
}

/** Every Ecole with its Categorie list (+ filière counts) — /ecoles and /accompagnement. */
export async function listEcolesForGrid(): Promise<EcoleForGrid[]> {
  return prisma.ecole.findMany({
    select: {
      id: true,
      nom: true,
      description: true,
      categories: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          libelle: true,
          description: true,
          tarifDepart: true,
          _count: { select: { filieres: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export interface FiliereDetail {
  id: string;
  nom: string;
  code: string | null;
  date: string | null;
  heure: string | null;
  salle: string | null;
  lienWhatsapp: string | null;
}

export interface CategorieDetail {
  id: string;
  libelle: string;
  typeAdmission: string;
  description: string | null;
  tarifDepart: number | null;
  filieres: FiliereDetail[];
}

export interface EcoleDetail {
  id: string;
  nom: string;
  description: string | null;
  lienWhatsappGeneral: string | null;
  categories: CategorieDetail[];
}

/** One Ecole (by URL slug, see lib/ecole-display.ts's ecoleSlug) with full nested categories/filieres. */
export async function getEcoleBySlug(slug: string): Promise<EcoleDetail | null> {
  const ecoles = await prisma.ecole.findMany({
    select: {
      id: true,
      nom: true,
      description: true,
      lienWhatsappGeneral: true,
      categories: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          libelle: true,
          typeAdmission: true,
          description: true,
          tarifDepart: true,
          filieres: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              nom: true,
              code: true,
              date: true,
              heure: true,
              salle: true,
              lienWhatsapp: true,
            },
          },
        },
      },
    },
  });
  return ecoles.find((e) => e.nom.toLowerCase() === slug.toLowerCase()) ?? null;
}

/** One Categorie (by id) with its Ecole + Filiere list — demand-form pages. */
export async function getCategorieById(id: string): Promise<
  | (CategorieDetail & {
      ecoleId: string;
      ecoleNom: string;
    })
  | null
> {
  const categorie = await prisma.categorie.findUnique({
    where: { id },
    select: {
      id: true,
      libelle: true,
      typeAdmission: true,
      description: true,
      tarifDepart: true,
      ecoleId: true,
      ecole: { select: { nom: true } },
      filieres: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          nom: true,
          code: true,
          date: true,
          heure: true,
          salle: true,
          lienWhatsapp: true,
        },
      },
    },
  });
  if (!categorie) return null;
  return {
    id: categorie.id,
    libelle: categorie.libelle,
    typeAdmission: categorie.typeAdmission,
    description: categorie.description,
    tarifDepart: categorie.tarifDepart,
    filieres: categorie.filieres,
    ecoleId: categorie.ecoleId,
    ecoleNom: categorie.ecole.nom,
  };
}
