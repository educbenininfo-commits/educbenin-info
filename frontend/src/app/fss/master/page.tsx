// Écran "Dépôt du dossier de Master" — 07-demande-master.md.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DemandFormPage } from '@/components/demande/DemandFormPage';
import { getCategorieById } from '@/lib/server/schools/queries';
import { CATEGORIE_FSS_MASTER_ID } from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'Dépôt du dossier de Master — FSS',
  description: '15 filières de Master à la FSS : pièces à fournir et tarif du dépôt de dossier.',
  alternates: { canonical: '/fss/master' },
};

export default async function DemandeMasterPage() {
  const categorie = await getCategorieById(CATEGORIE_FSS_MASTER_ID);
  if (!categorie) notFound();

  return (
    <DemandFormPage
      activeNav="ecole-fss"
      ecoleNom={categorie.ecoleNom}
      eyebrow="FSS · Accompagnement"
      title="Dépôt du dossier de Master"
      lead="15 filières de Master, sur dépôt de dossier, sans concours ni composition. Nous rassemblons, vérifions et déposons votre dossier auprès de la FSS."
      piecesLegend="d'après le communiqué N°725/UAC/FSS du 8 avril 2026"
      pieces={[
        'Une demande manuscrite adressée au Doyen de la FSS',
        "Une copie légalisée de l'acte de naissance",
        'Une copie légalisée du diplôme de Licence',
        "Une attestation d'authenticité (ou attestation de dépôt d'authenticité et récapitulatif de la demande)",
        <>
          Relevés de notes et attestation de succès des années d&rsquo;études suivies à
          l&rsquo;université de provenance{' '}
          <em style={{ color: 'var(--prod-ink-faint)' }}>— cas de transfert uniquement</em>
        </>,
        'Certificat de nationalité',
        'Curriculum vitae',
        <>
          Quittance CUCA de <strong>20 000 FCFA</strong> (Compte Trésor Public N° BJ660 01001
          000001044399 95, intitulé FSS)
        </>,
        <>
          Quittance CUO de <strong>2 000 FCFA</strong> (Compte Trésor Public N° BJ660 01001
          000001047722 20, intitulé Rectorat/Produits accessoires)
        </>,
      ]}
      infoCallout={
        <>
          Mêmes pièces qu&rsquo;au niveau Licence : seul le diplôme d&rsquo;entrée change (Licence à
          la place du Baccalauréat) et les frais CUCA sont de 20 000 FCFA. Vous avez le Bac et
          démarrez à la FSS ? Voir <Link href="/fss/licence">Licence — filières de base</Link>.
        </>
      }
      tarifDepart={categorie.tarifDepart}
      tarifNote="Tarif indicatif (accompagnement Educ Bénin), communiqué avant confirmation — distinct des frais officiels CUCA/CUO ci-contre."
      categorieId={categorie.id}
      filiereOptions={categorie.filieres.map((f) => ({ id: f.id, label: f.nom }))}
      filiereStepLabel="Choisissez votre filière de Master"
      independenceSuffix="la FSS"
      stepsSummary="3 étapes, environ 5 minutes."
      contactLabel="WhatsApp FSS — Educ Bénin"
    />
  );
}
