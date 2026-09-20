// Écran "Dépôt du dossier — Cycle I (Licence SIO)" — 08-demande-inmes-c1.md.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DemandFormPage } from '@/components/demande/DemandFormPage';
import { getCategorieById } from '@/lib/server/schools/queries';
import { CATEGORIE_INMES_CYCLE1_ID } from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'Dépôt du dossier — Cycle I (Licence SIO) — INMeS',
  description:
    'Pièces à fournir et tarif pour le dépôt du dossier Cycle I (Sciences Infirmières et Obstétricales) à l’INMeS.',
  alternates: { canonical: '/inmes/cycle-1' },
};

export default async function DemandeInmesCycle1Page() {
  const categorie = await getCategorieById(CATEGORIE_INMES_CYCLE1_ID);
  if (!categorie) notFound();

  return (
    <DemandFormPage
      activeNav="ecole-inmes"
      ecoleNom={categorie.ecoleNom}
      eyebrow="INMeS · Accompagnement"
      title="Dépôt du dossier — Cycle I (Licence SIO)"
      lead="Sciences Infirmières et Obstétricales, Cycle I — inscription sur dépôt de dossier (hors concours national boursier, réservé aux candidats nationaux). Nous rassemblons, vérifions et déposons votre dossier de candidature auprès de l'INMeS."
      piecesLegend={categorie.piecesLegend}
      pieces={categorie.piecesAFournir}
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
