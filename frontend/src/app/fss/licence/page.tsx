// Écran "Dépôt du dossier — Médecine, Pharmacie & filières de base
// (Licence)" — 06-demande-medecine-licence.md.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DemandFormPage } from '@/components/demande/DemandFormPage';
import { getCategorieById } from '@/lib/server/schools/queries';
import { CATEGORIE_FSS_LICENCE_ID } from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'Dépôt du dossier — Médecine, Pharmacie & filières de base (Licence)',
  description:
    'Pièces à fournir et tarif pour le dépôt de dossier Licence à la FSS (Médecine générale, Pharmacie, ESAS, Kinésithérapie, Nutrition).',
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
      title="Dépôt du dossier — Médecine, Pharmacie & filières de base (Licence)"
      lead="Médecine générale, Pharmacie, ESAS, Kinésithérapie, Nutrition : admission en 1re année sur dépôt de dossier, sans concours ni composition. Nous rassemblons, vérifions et déposons votre dossier auprès de la FSS."
      piecesLegend="d'après le communiqué N°725/UAC/FSS du 8 avril 2026"
      pieces={[
        'Une demande manuscrite adressée au Doyen de la FSS',
        "Une copie légalisée de l'acte de naissance",
        "Une copie légalisée de l'attestation de réussite au Baccalauréat (un an d'ancienneté au plus)",
        "Une attestation d'authenticité (ou attestation de dépôt d'authenticité et récapitulatif de la demande)",
        <>
          Relevés de notes et attestation de succès des années d&rsquo;études suivies à
          l&rsquo;université de provenance{' '}
          <em style={{ color: 'var(--prod-ink-faint)' }}>— cas de transfert uniquement</em>
        </>,
        'Certificat de nationalité',
        'Curriculum vitae',
        <>
          Quittance CUCA de <strong>10 000 FCFA</strong> (Compte Trésor Public N° BJ660 01001
          000001044399 95, intitulé FSS)
        </>,
        <>
          Quittance CUO de <strong>2 000 FCFA</strong> (Compte Trésor Public N° BJ660 01001
          000001047722 20, intitulé Rectorat/Produits accessoires)
        </>,
      ]}
      infoCallout={
        <>
          Cette catégorie n&rsquo;a ni concours ni composition : l&rsquo;admission se fait
          uniquement sur dépôt de dossier (inscription ou transfert). Filières concernées : Médecine
          générale, Pharmacie, ESAS (École Supérieure des Assistants Sociaux), Kinésithérapie,
          Nutrition. Vous avez déjà votre Licence et visez un Master ? Voir{' '}
          <Link href="/fss/master">Master FSS</Link>. Le niveau Doctorat (spécialisation) est
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
