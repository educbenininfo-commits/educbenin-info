// Écran "Toutes les écoles" — extension multi-écoles, 2026-09. Nouveau,
// hors DESIGN-SPEC.md d'origine (capture de référence :
// screenshots/02-toutes-les-ecoles.png). force-dynamic : cette page existe
// pour refléter la liste réelle des Écoles/Catégories — un back-office qui
// ajoute une école doit apparaître ici sans redéploiement.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { DisclaimerBar } from '@/components/public/DisclaimerBar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { listEcolesForGrid } from '@/lib/server/schools/queries';
import { ecoleSlug, ecoleBadge, ecoleDescription, ecoleHighlightPill } from '@/lib/ecole-display';

export const metadata: Metadata = {
  title: 'Toutes les écoles et facultés accompagnées',
  description:
    'Parcourez les établissements accompagnés par Educ Bénin et ouvrez celui qui vous concerne pour voir ses filières, ses pièces à fournir et son tarif.',
  alternates: { canonical: '/ecoles' },
};

export default async function EcolesPage() {
  const ecoles = await listEcolesForGrid();

  return (
    <div className="prod">
      <PublicNav active="ecole-toutes" />
      <PublicBottomNav active="ecole-toutes" />
      <DisclaimerBar />

      <div className="page-head pw">
        <div className="k">Établissements</div>
        <h1>Toutes les écoles et facultés accompagnées</h1>
        <p>
          Parcourez les établissements disponibles sur Educ Bénin et ouvrez celui qui vous concerne
          pour voir ses filières, ses pièces à fournir et son tarif. La plateforme s&rsquo;adresse
          en priorité aux candidats venus de l&rsquo;étranger, qui n&rsquo;ont pas toujours les
          bonnes informations ou ne savent pas comment s&rsquo;y prendre une fois qu&rsquo;ils les
          ont.
        </p>
      </div>

      <div className="pw content-pad">
        <div className="ecole-grid">
          {ecoles.map((ecole) => (
            <Link key={ecole.id} href={`/${ecoleSlug(ecole.nom)}`} className="ecole-card">
              <div className="badge">{ecoleBadge(ecole.nom)}</div>
              <h3>{ecole.description ?? ecole.nom}</h3>
              <p>{ecoleDescription(ecole.nom, ecole.categories)}</p>
              <div className="tags">
                <span className="pill neutral">{ecoleHighlightPill(ecole.categories)}</span>
                <span className="pill ok">Accompagnement disponible</span>
              </div>
              <span className="cta">Voir les filières {ecole.nom} →</span>
            </Link>
          ))}
        </div>

        <div className="callout info" style={{ marginTop: 24 }}>
          <span className="icn">ⓘ</span>
          <span>
            Vous êtes dans un autre établissement de l&rsquo;UAC, ou une autre filière ?{' '}
            <Link href="/#suggestion">Suggérez-le nous</Link>, nous étudierons son ajout.
          </span>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
