// Écran "Accompagnement (vue d'ensemble)" — hub listant TOUS les
// accompagnements disponibles, toutes écoles confondues, pour ne jamais
// avoir à tout lister dans le menu principal (05-accompagnement-hub.md).
// Remplace l'ancien /accompagnement (le formulaire D.E.S., relocalisé
// inchangé vers /fss/des). force-dynamic : catégories/tarifs viennent du
// back-office.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { DisclaimerBar } from '@/components/public/DisclaimerBar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { listEcolesForGrid } from '@/lib/server/schools/queries';
import {
  CATEGORIE_FSS_MEDECINE_PHARMACIE_ID,
  CATEGORIE_FSS_LICENCE_ID,
  CATEGORIE_FSS_DES_ID,
  CATEGORIE_FSS_MASTER_ID,
  CATEGORIE_INMES_CYCLE1_ID,
  CATEGORIE_INMES_CYCLE2_ID,
} from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'Tous les accompagnements disponibles',
  description:
    'Vue d’ensemble de tous les accompagnements Educ Bénin, toutes écoles confondues — chaque carte ouvre directement la demande correspondante.',
  alternates: { canonical: '/accompagnement' },
};

// Maps each Categorie to the demand-form route hosting its "Faire une
// demande" button — see the ecoleSlug()-based routing convention in
// PublicNav's doc comment (/fss/licence, /fss/des, /fss/master,
// /inmes/cycle-1, /inmes/cycle-2).
const DEMAND_HREF: Record<string, string> = {
  [CATEGORIE_FSS_MEDECINE_PHARMACIE_ID]: '/fss/medecine-pharmacie',
  [CATEGORIE_FSS_LICENCE_ID]: '/fss/licence',
  [CATEGORIE_FSS_DES_ID]: '/fss/des',
  [CATEGORIE_FSS_MASTER_ID]: '/fss/master',
  [CATEGORIE_INMES_CYCLE1_ID]: '/inmes/cycle-1',
  [CATEGORIE_INMES_CYCLE2_ID]: '/inmes/cycle-2',
};

export default async function AccompagnementHubPage() {
  const ecoles = await listEcolesForGrid();

  return (
    <div className="prod">
      <PublicNav active="accompagnement" />
      <PublicBottomNav active="accompagnement" />
      <DisclaimerBar />

      <div className="page-head pw">
        <div className="k">Accompagnement</div>
        <h1>Tous les accompagnements disponibles</h1>
        <p>
          Choisissez la situation qui vous concerne : chaque carte ouvre directement la demande
          correspondante, avec ses pièces à fournir et son tarif.
        </p>
      </div>

      <div className="pw content-pad">
        {ecoles.map((ecole) => (
          <div key={ecole.id} className="section-bleed" style={{ marginBottom: 0 }}>
            <div className="section pw" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <h2>
                {ecole.nom} — {ecole.description ?? ecole.nom}
              </h2>
              <p className="sub">{ecole.categories.map((c) => c.description).join(' ')}</p>
              <div className="cat-grid">
                {ecole.categories.map((cat) => {
                  const href = DEMAND_HREF[cat.id];
                  if (!href) return null;
                  return (
                    <div key={cat.id} className="cat-card">
                      <span className="eyebrow-pill">
                        {ecole.nom} · {cat.libelle}
                      </span>
                      <h3>{cat.libelle}</h3>
                      <p>{cat.description}</p>
                      <Link href={href} className="btn btn-primary btn-sm">
                        Faire une demande
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        <div className="callout info" style={{ marginTop: 8 }}>
          <span className="icn">ⓘ</span>
          <span>
            Vous ne trouvez pas votre établissement ou votre filière ?{' '}
            <Link href="/#suggestion">Suggérez-le nous depuis la page d&rsquo;accueil</Link>.
          </span>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
