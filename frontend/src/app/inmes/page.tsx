// Écran "École — INMeS" — extension multi-écoles, 2026-09 (capture de
// référence : screenshots/04-ecole-inmes.png). force-dynamic : catégories
// /filières/tarifs viennent du back-office.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { DisclaimerBar } from '@/components/public/DisclaimerBar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { SimpleHero } from '@/components/public/SimpleHero';
import { SuggestionForm } from '@/components/public/SuggestionForm';
import { getEcoleBySlug, type CategorieDetail } from '@/lib/server/schools/queries';
import {
  CATEGORIE_INMES_CYCLE1_ID,
  CATEGORIE_INMES_CYCLE2_ID,
} from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'École — INMeS (Institut National Médico-Sanitaire)',
  description:
    "Cycle I (Licence) et Cycle II (Master) en Sciences Infirmières et Obstétricales à l'INMeS : pièces à fournir et tarifs pour le dépôt de dossier.",
  alternates: { canonical: '/inmes' },
};

export default async function EcoleInmesPage() {
  const ecole = await getEcoleBySlug('inmes');
  if (!ecole) notFound();

  const cycle1 = ecole.categories.find((c) => c.id === CATEGORIE_INMES_CYCLE1_ID);
  const cycle2 = ecole.categories.find((c) => c.id === CATEGORIE_INMES_CYCLE2_ID);

  return (
    <div className="prod">
      <PublicNav active="ecole-inmes" />
      <PublicBottomNav active="ecole-inmes" />
      <DisclaimerBar ecoleNom={ecole.nom} />

      <SimpleHero
        eyebrow={`${ecole.description ?? ecole.nom} · UAC`}
        title="Votre dossier INMeS, accompagné de bout en bout."
        lead={
          <>
            Educ Bénin accompagne les candidats de l&rsquo;INMeS pour le Cycle I (Licence) et le
            Cycle II (Master) en Sciences Infirmières et Obstétricales : rassemblement des pièces,
            inscription en ligne et dépôt du dossier — avec un suivi clair à chaque étape. Notre
            accompagnement porte sur le dépôt du dossier d&rsquo;inscription (Cycle I comme Cycle
            II) ; le concours national d&rsquo;entrée du Cycle I, réservé aux candidats nationaux
            qui briguent la bourse d&rsquo;État, n&rsquo;entre pas dans notre accompagnement.
          </>
        }
      />

      <div className="section-bleed">
        <div className="section pw">
          <h2>Deux cycles à l&rsquo;INMeS</h2>
          <p className="sub">
            Choisissez votre cycle pour voir les pièces demandées, la date de composition et la
            communauté WhatsApp dédiée — distincte de celles de la FSS.{' '}
            <em>Filières et pièces provisoires, à confirmer avec l&rsquo;INMeS.</em>
          </p>
          <div className="cat-grid">
            {cycle1 && (
              <CycleCard
                categorie={cycle1}
                href="/inmes/cycle-1"
                waLabel="Communauté WhatsApp Cycle I"
              />
            )}
            {cycle2 && (
              <CycleCard
                categorie={cycle2}
                href="/inmes/cycle-2"
                waLabel="Communauté WhatsApp Cycle II"
              />
            )}
          </div>

          {ecole.lienWhatsappGeneral && (
            <div className="wa-btn" style={{ marginTop: 20, maxWidth: 420 }}>
              <span className="ic">✆</span>
              <a href={ecole.lienWhatsappGeneral} target="_blank" rel="noopener noreferrer">
                Communauté {ecole.nom} générale
                <small>Tous candidats, Cycle I et Cycle II</small>
              </a>
            </div>
          )}

          <div className="callout info" style={{ marginTop: 20 }}>
            <span className="icn">ⓘ</span>
            <span>
              D&rsquo;autres filières de l&rsquo;INMeS seront ajoutées dès qu&rsquo;elles seront
              confirmées. <a href="#suggestion">Suggérez la vôtre</a> si elle n&rsquo;apparaît pas
              encore.
            </span>
          </div>
        </div>
      </div>

      <div className="section-bleed">
        <div className="section pw">
          <h2>Votre filière INMeS n&rsquo;est pas encore listée ?</h2>
          <p className="sub">
            Dites-nous ce qu&rsquo;il vous faut : nous étudions l&rsquo;ajout de nouvelles filières
            à chaque rentrée.
          </p>
          <SuggestionForm
            id="suggestion"
            recherchePlaceholder="Ex. : Cycle I — Sciences Infirmières"
          />
        </div>
      </div>

      <PublicFooter currentEcoleNom={ecole.nom} contactLabel="WhatsApp INMeS — Educ Bénin" />
    </div>
  );
}

function CycleCard({
  categorie,
  href,
  waLabel,
}: {
  categorie: CategorieDetail;
  href: string;
  waLabel: string;
}) {
  const filiere = categorie.filieres[0];
  return (
    <div className="cat-card">
      <span className="eyebrow-pill">INMeS · {categorie.libelle}</span>
      <h3>{filiere?.nom ?? categorie.libelle}</h3>
      <p>{categorie.description}</p>
      {(filiere?.lienWhatsapp ?? null) && (
        <a
          href={filiere!.lienWhatsapp!}
          target="_blank"
          rel="noopener noreferrer"
          className="pill neutral"
          style={{ display: 'inline-block' }}
        >
          ✆ {waLabel}
        </a>
      )}
      <Link href={href} className="btn btn-primary btn-sm">
        Faire ma demande
      </Link>
    </div>
  );
}
