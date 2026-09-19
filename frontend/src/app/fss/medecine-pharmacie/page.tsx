// Écran "Dépôt du dossier — Médecine, Pharmacie" — split out of the former
// bundled "Médecine, Pharmacie & filières de base (Licence)" Categorie on
// 2026-09-20 (ESAS/Kinésithérapie/Nutrition moved to their own "Licence"
// Categorie, see /fss/licence).
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DemandFormPage } from '@/components/demande/DemandFormPage';
import { getCategorieById } from '@/lib/server/schools/queries';
import { CATEGORIE_FSS_MEDECINE_PHARMACIE_ID } from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'Dépôt du dossier — Médecine, Pharmacie (FSS)',
  description:
    'Pièces à fournir et tarif pour le dépôt de dossier Médecine générale / Pharmacie à la FSS.',
  alternates: { canonical: '/fss/medecine-pharmacie' },
};

export default async function DemandeMedecinePharmaciePage() {
  const categorie = await getCategorieById(CATEGORIE_FSS_MEDECINE_PHARMACIE_ID);
  if (!categorie) notFound();

  return (
    <DemandFormPage
      activeNav="ecole-fss"
      ecoleNom={categorie.ecoleNom}
      eyebrow="FSS · Accompagnement"
      title="Dépôt du dossier — Médecine, Pharmacie"
      lead="Médecine générale, Pharmacie : admission en 1re année sur dépôt de dossier, sans concours ni composition. Nous rassemblons, vérifions et déposons votre dossier auprès de la FSS."
      piecesLegend={categorie.piecesLegend}
      pieces={categorie.piecesAFournir}
      infoCallout={
        <>
          Cette catégorie n&rsquo;a ni concours ni composition : l&rsquo;admission se fait
          uniquement sur dépôt de dossier (inscription ou transfert). Filières concernées : Médecine
          générale, Pharmacie. Vous cherchez ESAS, Kinésithérapie ou Nutrition ? Voir{' '}
          <Link href="/fss/licence">Licence</Link>. Vous avez déjà votre Licence et visez un Master
          ? Voir <Link href="/fss/master">Master FSS</Link>. Le niveau Doctorat (spécialisation) est
          accompagné via le <Link href="/fss/des">D.E.S.</Link>.
        </>
      }
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
