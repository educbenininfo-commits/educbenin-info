// Écran Accueil — extension multi-écoles, 2026-09 (00c-page-accueil.md).
// Généralisé pour présenter tous les établissements accompagnés (FSS,
// INMeS) au lieu d'être centré uniquement sur la FSS — voir le prototype de
// référence, screenshots/00c-page-accueil.png. force-dynamic : la section
// "Choisissez votre établissement" et le pied de page lisent la liste réelle
// des Écoles, une école ajoutée au back-office doit apparaître ici sans
// redéploiement (même principe que /ecoles, /accompagnement).
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowRight, BadgeCheck, BellRing, FileCheck2, GraduationCap } from 'lucide-react';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { HowItWorksSection } from '@/components/public/HowItWorksSection';
import { SuggestionForm } from '@/components/public/SuggestionForm';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';
import { listEcolesForGrid } from '@/lib/server/schools/queries';
import { getContactSettings } from '@/lib/server/site-settings';
import { ecoleSlug, ecoleBadge, ecoleDescription, ecoleHighlightPill } from '@/lib/ecole-display';
import { formatWhatsapp, whatsappLink } from '@/lib/contact-display';

const HERO_TRACK: { label: string; state: 'done' | 'now' | 'next' }[] = [
  { label: 'Dossier en cours de traitement', state: 'done' },
  { label: 'Authentification du diplôme', state: 'done' },
  { label: 'Inscription en ligne', state: 'now' },
  { label: 'Dépôt de dossier en cours', state: 'next' },
  { label: 'Dossier déposé avec succès', state: 'next' },
];

// Minimal, strictly factual JSON-LD (name/url/description/logo only) — no
// address, phone, or founding date, since none of that is finalized yet
// (see Mentions légales' "[À COMPLÉTER]" fields). Fabricating those for SEO
// would risk a Google structured-data mismatch penalty, not help ranking.
const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Educ Bénin',
  url: 'https://www.educbenin.info',
  logo: 'https://www.educbenin.info/logo/lockup-dark.svg',
  description:
    "Educ Bénin accompagne les candidats de la FSS et de l'INMeS : rassemblement des pièces, authentification de diplôme pour les candidats étrangers, inscription en ligne et dépôt du dossier — avec un suivi clair à chaque étape.",
};

export default async function Home() {
  const [ecoles, contact] = await Promise.all([listEcolesForGrid(), getContactSettings()]);

  return (
    <div className="prod">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      <PublicNav active="home" />
      <PublicBottomNav active="home" />

      <div className="disclaimer-bar-bleed">
        <div className="disclaimer-bar pw">
          ⓘ&nbsp; Educ Bénin est un service d&rsquo;accompagnement indépendant — il ne se substitue
          ni à la FSS ni à l&rsquo;UAC.
          <Link href="/non-affiliation">En savoir plus</Link>
        </div>
      </div>

      <div className="hero-bleed">
        <div className="hero pw">
          <div className="hero-text">
            <span className="eyebrow-chip">
              <span className="dot" />
              Plateforme d&rsquo;accompagnement · Cotonou, UAC
            </span>
            <h1>
              Un accompagnement clair,{' '}
              <span className="hl">pour chaque établissement, à chaque étape du dossier.</span>
            </h1>
            <p className="lead">
              Educ Bénin accompagne les candidats de la FSS et de l&rsquo;INMeS : rassemblement des
              pièces, authentification de diplôme pour les candidats étrangers, inscription en ligne
              et dépôt du dossier — avec un suivi clair à chaque étape.
            </p>
            <div className="hero-actions">
              <a href="#etablissements" className="btn btn-primary btn-lg">
                Choisir mon établissement <ArrowRight size={18} />
              </a>
              <Link href="/suivre-mon-dossier" className="btn btn-outline btn-lg">
                Suivre mon dossier
              </Link>
            </div>
            <ul className="hero-checks">
              <li>FSS et INMeS</li>
              <li>Suivi de dossier en ligne</li>
              <li>Accompagnement sur WhatsApp</li>
            </ul>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="phone">
              <div className="phone-head">
                Educ Bénin <span className="badge">1</span>
              </div>
              <div className="phone-card">
                <div className="k">Probatoire spécialité · D.E.S.</div>
                <div className="t">Dr. LISSANON Luc.</div>
              </div>
              <div className="phone-track">
                {HERO_TRACK.map((row, i) => (
                  <div key={row.label} className={`row ${row.state}`}>
                    <span className="num">{row.state === 'done' ? '✓' : i + 1}</span>
                    <span className="label">{row.label}</span>
                  </div>
                ))}
              </div>
              <div className="phone-cta">Suivre mon dossier</div>
            </div>
            <div className="float-card a">
              <span className="icon-chip success">
                <BellRing />
              </span>
              <span>
                <strong>Dossier reçu</strong>
                EB-202610-014 · D.E.S.
              </span>
            </div>
            <div className="float-card b">
              <span className="icon-chip gold">
                <BadgeCheck />
              </span>
              <span>
                <strong>Diplôme authentifié</strong>
                Étape validée
              </span>
            </div>
            <div className="float-card c">
              <span className="icon-chip">
                <FileCheck2 />
              </span>
              <span>
                <strong>Preuve de dépôt</strong>
                Disponible au téléchargement
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="band-bleed">
        <div className="band pw">
          <span>
            <strong>Un seul interlocuteur pour tout votre dossier.</strong> Pièces,
            authentification, inscription et dépôt.
          </span>
          <div className="band-pills">
            {ecoles.map((ecole) => (
              <Link key={ecole.id} href={`/${ecoleSlug(ecole.nom)}`} className="band-pill">
                <GraduationCap size={16} /> {ecole.nom}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="section-bleed" id="etablissements">
        <div className="section pw">
          <span className="section-kicker">Établissements accompagnés</span>
          <h2>Choisissez votre établissement</h2>
          <p className="sub">
            Deux établissements accompagnés aujourd&rsquo;hui — d&rsquo;autres facultés et instituts
            de l&rsquo;UAC viendront s&rsquo;y ajouter.
          </p>

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
                <span className="cta">
                  Voir les filières {ecole.nom} <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>

          <div className="callout info" style={{ marginTop: 24 }}>
            <span className="icn">ⓘ</span>
            <span>
              Vous désirez vous inscrire dans une autre filière de l&rsquo;UAC ? Veuillez{' '}
              <a href="#suggestion">la suggérer</a>. Merci.
            </span>
          </div>
        </div>
      </div>

      <HowItWorksSection />

      <div className="section-bleed">
        <div className="section pw">
          <h2>Votre établissement ou votre filière n&rsquo;est pas encore listé ?</h2>
          <p className="sub">
            Dites-nous ce qu&rsquo;il vous faut : nous étudions l&rsquo;ajout de nouveaux
            établissements et filières à chaque rentrée.
          </p>
          <SuggestionForm
            id="suggestion"
            title="Suggérer une école ou une filière"
            rechercheLabel="École ou filière recherchée"
            recherchePlaceholder="Ex. : Faculté de Droit — Sciences Politiques"
            confirmationSubtext="Merci ! Nous reviendrons vers vous si l'école (ou la filière) est ajoutée."
            companionText="Chaque suggestion est examinée par l'équipe Educ Bénin."
          />
        </div>
      </div>

      <div className="footer-bleed">
        <div className="footer pw">
          <div className="footer-grid">
            <div>
              <div className="p-logo" style={{ marginBottom: 10 }}>
                <EducBeninLogo height={28} />
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--prod-ink-muted)', maxWidth: '34ch' }}>
                Service indépendant d&rsquo;accompagnement administratif. Educ Bénin n&rsquo;est
                affilié à aucun établissement de l&rsquo;UAC.
              </p>
            </div>
            <div>
              <h6>Établissements</h6>
              <Link href="/ecoles">Toutes les écoles</Link>
              {ecoles.map((ecole) => (
                <Link key={ecole.id} href={`/${ecoleSlug(ecole.nom)}`}>
                  École — {ecole.nom}
                </Link>
              ))}
              <Link href="/#suggestion">Suggérer une école</Link>
            </div>
            <div>
              <h6>Plateforme</h6>
              <Link href="/accompagnement">Accompagnement</Link>
              <Link href="/suivre-mon-dossier">Suivre mon dossier</Link>
            </div>
            <div>
              <h6>Légal</h6>
              <Link href="/mentions-legales">Mentions légales</Link>
              <Link href="/cgu-cgv">CGU / CGV</Link>
              <Link href="/confidentialite">Politique de confidentialité</Link>
            </div>
            <div>
              <h6>Contact</h6>
              <a href={whatsappLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer">
                WhatsApp : {formatWhatsapp(contact.whatsapp)}
              </a>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
              <Link href="/contact">Formulaire de contact</Link>
            </div>
          </div>
          <div className="legal-line">
            <span>© 2026 Educ Bénin — Cotonou, Bénin</span>
            <span>Aucune affiliation avec la FSS, l&rsquo;INMeS ou l&rsquo;UAC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
