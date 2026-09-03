// Écran Accueil — docs/design-reference/DESIGN-SPEC.md, section "1. Accueil".
// Contenu, structure et valeurs reproduits à la lettre depuis
// docs/design-reference/educbenin-prototype.html (source de vérité testée).

import Link from 'next/link';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { SPECIALTIES } from '@/lib/specialties';

const HERO_TRACK: { label: string; done: boolean; num: string }[] = [
  { label: 'Dossier en cours de traitement', done: true, num: '✓' },
  { label: 'Authentification du diplôme', done: true, num: '✓' },
  { label: 'Inscription en ligne', done: false, num: '3' },
  { label: 'Dépôt de dossier en cours', done: false, num: '4' },
  { label: 'Dossier déposé avec succès', done: false, num: '5' },
];

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: '01', title: 'Dossier reçu', desc: 'Vous déposez votre demande et vos pièces en un clic.' },
  {
    n: '02',
    title: 'Authentification',
    desc: "Vous recevez et remplissez le formulaire d'authentification de diplôme.",
  },
  {
    n: '03',
    title: 'Inscription en ligne',
    desc: 'Vous vous inscrivez sur le portail CUO-SIGAN de l’UAC.',
  },
  {
    n: '04',
    title: 'Dépôt en cours',
    desc: 'Nous déposons votre dossier complet auprès de la FSS.',
  },
  {
    n: '05',
    title: 'Déposé avec succès',
    desc: 'Votre récépissé officiel est disponible au téléchargement.',
  },
];

// 6 premières spécialités du tableau SPECIALTIES (ordre exact du prototype —
// c'est aussi cet ordre qui détermine les 6 tuiles affichées sur l'accueil).
const HOME_SPECIALTIES = SPECIALTIES.slice(0, 6);

export default function Home() {
  return (
    <div className="prod">
      <PublicNav active="home" />
      <PublicBottomNav active="home" />

      <div className="disclaimer-bar-bleed">
        <div className="disclaimer-bar pw">
          ⓘ&nbsp; Educ Bénin est un service d&rsquo;accompagnement indépendant — il ne se substitue
          ni à la FSS ni à l&rsquo;UAC.
          <Link href="/mentions-legales">En savoir plus</Link>
        </div>
      </div>

      <div className="hero pw">
        <div className="hero-text">
          <div className="eyebrow">Probatoire spécialité · FSS / UAC</div>
          <h1>Votre dossier de probatoire, sans faux pas administratif.</h1>
          <p className="lead">
            Educ Bénin accompagne les médecins candidats aux 27 spécialités de la FSS :
            rassemblement des pièces, authentification de diplôme, inscription en ligne et dépôt du
            dossier — avec un suivi clair à chaque étape.
          </p>
        </div>

        <div className="hero-art">
          <div className="seal" />
          <div
            style={{
              fontSize: 12,
              opacity: 0.75,
              marginBottom: 14,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
            }}
          >
            État du dossier — Dr. Amoussou K.
          </div>
          <div className="hero-track">
            {HERO_TRACK.map((row) => (
              <div key={row.label} className={`row${row.done ? ' done' : ''}`}>
                <span className="num">{row.num}</span>
                <span className="label">{row.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-actions">
          <Link href="/accompagnement" className="btn btn-primary">
            Faire ma demande
          </Link>
          <Link href="/suivre-mon-dossier" className="btn btn-outline">
            Suivre mon dossier
          </Link>
        </div>
      </div>

      <div className="section-bleed">
        <div className="section pw">
          <h2>Comment ça marche</h2>
          <p className="sub">
            Cinq étapes, du dépôt de votre demande jusqu&rsquo;au récépissé officiel de la FSS.
          </p>
          <div className="steps-grid">
            {STEPS.map((step) => (
              <div key={step.n} className="step-card">
                <div className="n">{step.n}</div>
                <h5>{step.title}</h5>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-bleed">
        <div className="section pw">
          <h2>27 spécialités du D.E.S. de la FSS</h2>
          <p className="sub">
            Dates, salles et communautés WhatsApp mises à jour chaque année scolaire.
          </p>
          <div className="spec-grid">
            {HOME_SPECIALTIES.map((spec) => (
              <div key={spec.code} className="spec-tile">
                <div className="name">{spec.name}</div>
                <div className="code">D.E.S. · {spec.code}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Link href="/specialites" className="btn btn-ghost btn-sm">
              Voir les 27 spécialités →
            </Link>
          </div>
        </div>
      </div>

      <div className="section-bleed">
        <div className="section pw">
          <h2>Un accompagnement clair, un tarif clair</h2>
          <div className="price-box">
            <div>
              <div style={{ fontSize: 13, color: 'var(--prod-ink-muted)', marginBottom: 4 }}>
                Dépôt de dossier — une spécialité
              </div>
              <div className="amt">
                50 000 <span className="cur">FCFA</span>
              </div>
            </div>
            <Link href="/accompagnement" className="btn btn-outline btn-sm">
              Voir les pièces à fournir
            </Link>
          </div>
        </div>
      </div>

      <div className="footer-bleed">
        <div className="footer pw">
          <div className="footer-grid">
            <div>
              <div className="p-logo" style={{ marginBottom: 10 }}>
                <span className="mark">EB</span>Educ Bénin
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--prod-ink-muted)', maxWidth: '34ch' }}>
                Service indépendant d&rsquo;accompagnement administratif. Educ Bénin n&rsquo;est ni
                la FSS, ni l&rsquo;UAC.
              </p>
            </div>
            <div>
              <h6>Plateforme</h6>
              <Link href="/accompagnement">Accompagnement</Link>
              <Link href="/specialites">Spécialités</Link>
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
              <span className="footer-text">WhatsApp Educ Bénin</span>
              <span className="footer-text">contact@educbenin.bj</span>
            </div>
          </div>
          <div className="legal-line">
            <span>© 2026 Educ Bénin — Cotonou, Bénin</span>
            <span>Aucune affiliation avec la FSS ou l&rsquo;UAC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
