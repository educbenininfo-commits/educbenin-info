// Écran "École — FSS" — remplace/absorbe l'ancienne page /specialites
// (supprimée, voir sa redirection) et l'ancien menu "Spécialités". Extension
// multi-écoles, 2026-09 (capture de référence : screenshots/03-ecole-fss.png).
// force-dynamic : catégories/filières/tarifs viennent du back-office.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { DisclaimerBar } from '@/components/public/DisclaimerBar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { SimpleHero } from '@/components/public/SimpleHero';
import { HowItWorksSection } from '@/components/public/HowItWorksSection';
import { FiliereAccordionGrid } from '@/components/public/FiliereAccordionGrid';
import { getEcoleBySlug } from '@/lib/server/schools/queries';
import {
  CATEGORIE_FSS_MEDECINE_PHARMACIE_ID,
  CATEGORIE_FSS_LICENCE_ID,
  CATEGORIE_FSS_DES_ID,
  CATEGORIE_FSS_MASTER_ID,
} from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'École — FSS (Faculté des Sciences de la Santé)',
  description:
    'Licence, Master et Probatoire spécialité (D.E.S.) à la FSS : pièces à fournir, dates de composition et tarifs pour chaque catégorie.',
  alternates: { canonical: '/fss' },
};

export default async function EcoleFssPage() {
  const ecole = await getEcoleBySlug('fss');
  if (!ecole) notFound();

  const medecinePharmacie = ecole.categories.find(
    (c) => c.id === CATEGORIE_FSS_MEDECINE_PHARMACIE_ID,
  );
  const licence = ecole.categories.find((c) => c.id === CATEGORIE_FSS_LICENCE_ID);
  const des = ecole.categories.find((c) => c.id === CATEGORIE_FSS_DES_ID);
  const master = ecole.categories.find((c) => c.id === CATEGORIE_FSS_MASTER_ID);

  return (
    <div className="prod">
      <PublicNav active="ecole-fss" />
      <PublicBottomNav active="ecole-fss" />
      <DisclaimerBar ecoleNom={ecole.nom} />

      <SimpleHero
        eyebrow={`${ecole.description ?? ecole.nom} · UAC`}
        title="Votre dossier FSS, sans faux pas administratif."
        lead="Educ Bénin accompagne les candidats de la FSS : rassemblement des pièces, authentification de diplôme (candidats étrangers), inscription en ligne et dépôt du dossier — avec un suivi clair à chaque étape."
      />

      <div className="section-bleed">
        <div className="section pw">
          <h2>Quatre catégories de candidats à la FSS</h2>
          <p className="sub">
            Choisissez la catégorie qui correspond à votre situation. Médecine &amp; Pharmacie,
            Licence et Master : admission sur dépôt de dossier. Probatoire D.E.S. : composition
            propre à chaque spécialité (détail ci-dessous).
          </p>
          <div className="cat-grid">
            {medecinePharmacie && (
              <CategorieCard
                ecoleNom={ecole.nom}
                categorie={medecinePharmacie}
                href="/fss/medecine-pharmacie"
              />
            )}
            {licence && (
              <CategorieCard ecoleNom={ecole.nom} categorie={licence} href="/fss/licence" />
            )}
            {des && <CategorieCard ecoleNom={ecole.nom} categorie={des} href="/fss/des" featured />}
            {master && <CategorieCard ecoleNom={ecole.nom} categorie={master} href="/fss/master" />}
          </div>
        </div>
      </div>

      <HowItWorksSection title="Comment ça marche — Probatoire spécialité" />

      {des && (
        <div className="section-bleed">
          <div className="section pw">
            <h2>27 spécialités du D.E.S. — année 2026-2027</h2>
            <p className="sub">
              Cliquez sur une spécialité pour voir sa date, sa salle de composition et rejoindre les
              communautés WhatsApp.
            </p>
            <FiliereAccordionGrid
              filieres={des.filieres}
              ecoleWhatsappGeneral={ecole.lienWhatsappGeneral}
              ecoleNom={ecole.nom}
              categorieLabel="D.E.S."
            />
          </div>
        </div>
      )}

      <PublicFooter currentEcoleNom={ecole.nom} contactLabel="WhatsApp FSS — Educ Bénin" />
    </div>
  );
}

function CategorieCard({
  ecoleNom,
  categorie,
  href,
  featured,
}: {
  ecoleNom: string;
  categorie: { libelle: string; description: string | null; tarifDepart: number | null };
  href: string;
  featured?: boolean;
}) {
  return (
    <Link href={href} className={`cat-card${featured ? ' featured' : ''}`}>
      <span className="eyebrow-pill">
        {ecoleNom} · {categorie.libelle}
      </span>
      <h3>{categorie.libelle}</h3>
      <p>{categorie.description}</p>
      <span className="cta">Faire ma demande →</span>
    </Link>
  );
}
