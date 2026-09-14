// Multi-school launch reference data — 2 schools (FSS, INMeS), 5
// categories, ~49 filières (including the 27 legacy D.E.S. specialties
// migrated from src/lib/specialties.ts). Also backfills every pre-existing
// Dossier row (all historically FSS/"Probatoire spécialité (D.E.S.)"
// applications) with the new required ecoleId/categorieId.
//
// Unlike seed-dev.ts, this is NOT gated by NODE_ENV=production — it's real
// launch data, not throwaway dev fixtures, and this project's dev/prod
// share one database (see CLAUDE.md). Idempotent: every row is upserted by
// a fixed id (see src/lib/server/schools/reference-ids.ts), so running
// this multiple times is safe.
//
// Usage: pnpm --filter frontend exec tsx scripts/seed-schools.ts

import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { SPECIALTIES } from '../src/lib/specialties';
import {
  ECOLE_FSS_ID,
  ECOLE_INMES_ID,
  CATEGORIE_FSS_LICENCE_ID,
  CATEGORIE_FSS_DES_ID,
  CATEGORIE_FSS_MASTER_ID,
  CATEGORIE_INMES_CYCLE1_ID,
  CATEGORIE_INMES_CYCLE2_ID,
} from '../src/lib/server/schools/reference-ids';

interface FiliereSeed {
  id: string;
  categorieId: string;
  nom: string;
  code?: string;
  date?: string;
  heure?: string;
  salle?: string;
}

const LICENCE_FILIERES: FiliereSeed[] = [
  {
    id: 'fil-licence-medecine-generale',
    categorieId: CATEGORIE_FSS_LICENCE_ID,
    nom: 'Médecine générale',
  },
  { id: 'fil-licence-pharmacie', categorieId: CATEGORIE_FSS_LICENCE_ID, nom: 'Pharmacie' },
  {
    id: 'fil-licence-esas',
    categorieId: CATEGORIE_FSS_LICENCE_ID,
    nom: 'ESAS (École Supérieure des Assistants Sociaux)',
  },
  {
    id: 'fil-licence-kinesitherapie',
    categorieId: CATEGORIE_FSS_LICENCE_ID,
    nom: 'Kinésithérapie',
  },
  { id: 'fil-licence-nutrition', categorieId: CATEGORIE_FSS_LICENCE_ID, nom: 'Nutrition' },
];

// The 27 D.E.S. specialties become Filiere rows 1:1 — same code, name,
// date, heure, salle as src/lib/specialties.ts. Dossier.specialtyCodes
// keeps referencing them by `code` (legacy multi-select); Filiere.code
// mirrors that same code so the two can be joined for display.
const DES_FILIERES: FiliereSeed[] = SPECIALTIES.map((s) => ({
  id: `fil-des-${s.code.toLowerCase()}`,
  categorieId: CATEGORIE_FSS_DES_ID,
  nom: s.name,
  code: s.code,
  date: s.date,
  heure: s.heure,
  salle: s.salle,
}));

const MASTER_NAMES = [
  "Protection de l'Enfance et de la Jeunesse",
  'Kinésithérapie',
  'Santé Communautaire',
  'Contrôle Qualité et Assurance Qualité des Médicaments et autres produits de santé',
  'Sommeil et ses pathologies',
  'Génétique Médicale',
  'Biostatistique Médicale',
  'Transitions Épidémiologiques et Santé Mondiale',
  'Biophysique et Radioprotection',
  'Pharmacologie',
  'Histologie-Embryologie-Cytogénétique',
  'Immunologie et Infections',
  'Anatomie et Organogenèse',
  "Santé de l'Enfant",
  'Sciences de la Santé Physiologie Humaine et Physiopathologie',
];

const MASTER_FILIERES: FiliereSeed[] = MASTER_NAMES.map((nom, i) => ({
  id: `fil-master-${i + 1}`,
  categorieId: CATEGORIE_FSS_MASTER_ID,
  nom,
}));

const INMES_FILIERES: FiliereSeed[] = [
  {
    id: 'fil-inmes-cycle1-siso',
    categorieId: CATEGORIE_INMES_CYCLE1_ID,
    nom: 'Sciences Infirmières et Obstétricales — Cycle I',
    // Real composition date not yet known — same "À confirmer" convention
    // used by src/lib/specialties.ts for unconfirmed D.E.S. dates. Must be
    // filled in once known; never leave this Categorie's Filiere without a
    // date/heure/salle since typeAdmission="concours_ou_composition" (see
    // schema.prisma's Ecole doc comment on the INMeS Cycle I special case).
    date: 'À confirmer',
    heure: 'À confirmer',
    salle: 'À confirmer',
  },
  {
    id: 'fil-inmes-cycle2-siso',
    categorieId: CATEGORIE_INMES_CYCLE2_ID,
    nom: 'Sciences Infirmières et Obstétricales — Cycle II',
  },
];

const ALL_FILIERES: FiliereSeed[] = [
  ...LICENCE_FILIERES,
  ...DES_FILIERES,
  ...MASTER_FILIERES,
  ...INMES_FILIERES,
];

interface SeedDeps {
  prisma?: PrismaClient;
}

export async function main(_args: string[] = [], deps: SeedDeps = {}): Promise<void> {
  const prisma = deps.prisma ?? new PrismaClient();
  try {
    await prisma.ecole.upsert({
      where: { id: ECOLE_FSS_ID },
      update: { nom: 'FSS', description: 'Faculté des Sciences de la Santé' },
      create: {
        id: ECOLE_FSS_ID,
        nom: 'FSS',
        description: 'Faculté des Sciences de la Santé',
        lienWhatsappGeneral: 'https://chat.whatsapp.com/fss-communaute-generale',
      },
    });
    await prisma.ecole.upsert({
      where: { id: ECOLE_INMES_ID },
      update: { nom: 'INMeS', description: 'Institut National Médico-Sanitaire' },
      create: {
        id: ECOLE_INMES_ID,
        nom: 'INMeS',
        description: 'Institut National Médico-Sanitaire',
      },
    });
    console.log('✓ Écoles (FSS, INMeS)');

    const categories: {
      id: string;
      ecoleId: string;
      libelle: string;
      typeAdmission: string;
      // "À partir de X FCFA" — values per 05-accompagnement-hub.md's reference
      // screenshot; the back-office Tarifs screen (prompt 13) is expected to
      // expose editing for this field later.
      tarifDepart: number;
      libelleCourt: string;
      // Curated body text — see schema.prisma's Categorie.description doc
      // comment. Wording per 03-ecole-fss.md / 04-ecole-inmes.md's cards.
      description: string;
    }[] = [
      {
        id: CATEGORIE_FSS_LICENCE_ID,
        ecoleId: ECOLE_FSS_ID,
        libelle: 'Médecine, Pharmacie & filières de base (Licence)',
        libelleCourt: 'Médecine & Pharmacie',
        typeAdmission: 'dossier',
        tarifDepart: 25000,
        description:
          'Médecine générale, Pharmacie, ESAS (École Supérieure des Assistants Sociaux), ' +
          'Kinésithérapie, Nutrition — admission en 1re année sur dépôt de dossier, sans ' +
          'concours ni composition. Pièces provisoires, à confirmer avec la FSS.',
      },
      {
        id: CATEGORIE_FSS_DES_ID,
        ecoleId: ECOLE_FSS_ID,
        libelle: 'Probatoire spécialité (D.E.S.)',
        libelleCourt: 'D.E.S.',
        typeAdmission: 'concours_ou_composition',
        tarifDepart: 50000,
        description:
          '27 spécialités de troisième cycle (niveau Doctorat, spécialisation), chacune avec ' +
          'sa date, sa salle de composition et son groupe WhatsApp dédié.',
      },
      {
        id: CATEGORIE_FSS_MASTER_ID,
        ecoleId: ECOLE_FSS_ID,
        libelle: 'Master',
        libelleCourt: 'Master',
        typeAdmission: 'dossier',
        tarifDepart: 50000,
        description:
          '15 filières de Master proposées par la FSS (Licence en poche). Mêmes pièces que ' +
          "la Licence, diplôme d'entrée différent.",
      },
      {
        id: CATEGORIE_INMES_CYCLE1_ID,
        ecoleId: ECOLE_INMES_ID,
        libelle: 'Cycle I',
        libelleCourt: 'Cycle I',
        typeAdmission: 'concours_ou_composition',
        tarifDepart: 25000,
        description:
          'Inscription sur dépôt de dossier (hors concours national boursier, réservé aux ' +
          "candidats nationaux) : le dossier est étudié par l'INMeS, avec une réponse " +
          "d'acceptation ou de refus. Pièces prévisionnelles pour l'accompagnement : fiche de " +
          'pré-inscription, pièce d’identité, relevé du Baccalauréat, taxe d’étude. Liste ' +
          'provisoire.',
      },
      {
        id: CATEGORIE_INMES_CYCLE2_ID,
        ecoleId: ECOLE_INMES_ID,
        libelle: 'Cycle II',
        libelleCourt: 'Cycle II',
        typeAdmission: 'dossier',
        tarifDepart: 30000,
        description:
          'Admission sur dossier, précédée de tests probatoires — date flexible, communiquée ' +
          'chaque année par un communiqué du Ministère. Tests prévus en Septembre 2026 (date ' +
          'à confirmer). Pièces prévisionnelles : diplôme de Licence SIO, lettre de ' +
          "motivation, attestation d'anglais, relevés de notes. Liste provisoire.",
      },
    ];
    for (const cat of categories) {
      await prisma.categorie.upsert({
        where: { id: cat.id },
        update: {
          libelle: cat.libelle,
          libelleCourt: cat.libelleCourt,
          typeAdmission: cat.typeAdmission,
          tarifDepart: cat.tarifDepart,
          description: cat.description,
        },
        create: cat,
      });
    }
    console.log(`✓ Catégories (${categories.length})`);

    for (const fil of ALL_FILIERES) {
      await prisma.filiere.upsert({
        where: { id: fil.id },
        update: {
          nom: fil.nom,
          code: fil.code ?? null,
          date: fil.date ?? null,
          heure: fil.heure ?? null,
          salle: fil.salle ?? null,
        },
        create: {
          id: fil.id,
          categorieId: fil.categorieId,
          nom: fil.nom,
          code: fil.code ?? null,
          date: fil.date ?? null,
          heure: fil.heure ?? null,
          salle: fil.salle ?? null,
        },
      });
    }
    console.log(`✓ Filières (${ALL_FILIERES.length})`);

    // One-time backfill of every pre-multi-school Dossier row (all
    // necessarily FSS/"Probatoire spécialité (D.E.S.)") already ran and
    // ecoleId/categorieId are now required NOT NULL columns — nothing left
    // to backfill on a fresh run of this idempotent script.
  } finally {
    if (!deps.prisma) {
      await prisma.$disconnect();
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
