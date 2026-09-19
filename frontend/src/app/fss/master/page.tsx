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
      piecesLegend={categorie.piecesLegend}
      pieces={categorie.piecesAFournir}
      infoCallout={
        <>
          Mêmes pièces qu&rsquo;au niveau Licence : seul le diplôme d&rsquo;entrée change (Licence à
          la place du Baccalauréat) et les frais CUCA sont de 20 000 FCFA. Vous avez le Bac et
          démarrez à la FSS ? Voir <Link href="/fss/medecine-pharmacie">Médecine, Pharmacie</Link>{' '}
          ou <Link href="/fss/licence">Licence</Link>.
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
