// Écran "Dépôt du dossier — Cycle II (Master SIO)" — 09-demande-inmes-c2.md.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DemandFormPage } from '@/components/demande/DemandFormPage';
import { getCategorieById } from '@/lib/server/schools/queries';
import { CATEGORIE_INMES_CYCLE2_ID } from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'Dépôt du dossier — Cycle II (Master SIO) — INMeS',
  description:
    'Pièces à fournir et tarif pour le dépôt du dossier Cycle II (Sciences Infirmières et Obstétricales) à l’INMeS.',
  alternates: { canonical: '/inmes/cycle-2' },
};

export default async function DemandeInmesCycle2Page() {
  const categorie = await getCategorieById(CATEGORIE_INMES_CYCLE2_ID);
  if (!categorie) notFound();

  return (
    <DemandFormPage
      activeNav="ecole-inmes"
      ecoleNom={categorie.ecoleNom}
      eyebrow="INMeS · Accompagnement"
      title="Dépôt du dossier — Cycle II (Master SIO)"
      lead="Sciences Infirmières et Obstétricales, Cycle II — admission sur dossier, précédée de tests probatoires. Nous rassemblons, vérifions et déposons votre dossier de candidature auprès de l'INMeS."
      piecesLegend={categorie.piecesLegend}
      pieces={categorie.piecesAFournir}
      infoCallout={
        <>
          Admission sur dossier, précédée de tests probatoires — date flexible, communiquée chaque
          année par un communiqué du Ministère. Tests prévus en Septembre 2026 (date à confirmer).
        </>
      }
      tarifDepart={categorie.tarifDepart}
      tarifNote="Tarif indicatif, à confirmer avant chaque confirmation de dossier."
      categorieId={categorie.id}
      filiereOptions={categorie.filieres.map((f) => ({ id: f.id, label: f.nom }))}
      independenceSuffix="l'INMeS"
      stepsSummary="2 étapes, environ 3 minutes."
      contactLabel="WhatsApp INMeS — Educ Bénin"
    />
  );
}
