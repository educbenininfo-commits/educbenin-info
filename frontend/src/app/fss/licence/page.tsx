// Écran "Dépôt du dossier — Licence" — 06-demande-medecine-licence.md.
// Médecine/Pharmacie split into its own Categorie+page on 2026-09-20 (see
// /fss/medecine-pharmacie); this page now covers only ESAS, Kinésithérapie
// et Nutrition, the three filières remaining under the "Licence" Categorie.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DemandFormPage } from '@/components/demande/DemandFormPage';
import { getCategorieById } from '@/lib/server/schools/queries';
import { CATEGORIE_FSS_LICENCE_ID } from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'Dépôt du dossier — Licence (FSS)',
  description:
    'Pièces à fournir et tarif pour le dépôt de dossier Licence à la FSS (ESAS, Kinésithérapie, Nutrition).',
  alternates: { canonical: '/fss/licence' },
};

export default async function DemandeLicencePage() {
  const categorie = await getCategorieById(CATEGORIE_FSS_LICENCE_ID);
  if (!categorie) notFound();

  return (
    <DemandFormPage
      activeNav="ecole-fss"
      ecoleNom={categorie.ecoleNom}
      eyebrow="FSS · Accompagnement"
      title="Dépôt du dossier — Licence"
      lead="ESAS, Kinésithérapie, Nutrition : admission en 1re année sur dépôt de dossier, sans concours ni composition. Nous rassemblons, vérifions et déposons votre dossier auprès de la FSS."
      piecesLegend={categorie.piecesLegend}
      pieces={categorie.piecesAFournir}
      tarifDepart={categorie.tarifDepart}
      tarifNote="Tarif indicatif (accompagnement Educ Bénin), communiqué avant confirmation — distinct des frais officiels CUCA/CUO ci-contre."
      categorieId={categorie.id}
      filiereOptions={categorie.filieres.map((f) => ({ id: f.id, label: f.nom }))}
      filiereStepLabel="Choisissez votre filière"
      independenceSuffix="la FSS"
      stepsSummary="3 étapes, environ 5 minutes."
      contactLabel="WhatsApp FSS — Educ Bénin"
    />
  );
}
