// Écran Accompagnement & demande — docs/design-reference/DESIGN-SPEC.md,
// section "2. Accompagnement & demande". Contenu et structure reproduits à
// la lettre depuis docs/design-reference/educbenin-prototype.html.

import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { DemandForm } from '@/components/accompagnement/DemandForm';

const PIECES: { id: string; content: React.ReactNode }[] = [
  {
    id: 'demande-doyen',
    content: 'Demande manuscrite ou saisie adressée au Doyen de la FSS (spécialité, année, e-mail)',
  },
  {
    id: 'lettre-vice-recteur',
    content:
      'Lettre manuscrite ou saisie adressée au Vice-Recteur des Affaires Académiques de l’UAC',
  },
  {
    id: 'extrait-naissance',
    content: 'Copie légalisée ou certifiée de l’extrait / certificat de naissance',
  },
  { id: 'nationalite', content: 'Copie légalisée ou certifiée du certificat de nationalité' },
  { id: 'bac', content: 'Copie légalisée ou certifiée du diplôme de Baccalauréat' },
  {
    id: 'doctorat',
    content: 'Copie légalisée ou certifiée du diplôme de Doctorat en Médecine',
  },
  { id: 'cv', content: 'Curriculum vitae détaillé' },
  {
    id: 'releves',
    content: (
      <>
        Relevés de notes de la 1<sup>re</sup> à la 7<sup>e</sup> année, légalisés ou certifiés
      </>
    ),
  },
  { id: 'releve-bac', content: 'Relevé de notes du Baccalauréat, légalisé ou certifié' },
];

export default function AccompagnementPage() {
  return (
    <div className="prod">
      <PublicNav active="accompagnement" />
      <PublicBottomNav active="accompagnement" />

      <div className="page-head pw">
        <div className="k">Accompagnement</div>
        <h1>Dépôt du dossier de probatoire spécialité</h1>
        <p>
          Nous rassemblons, vérifions et déposons votre dossier auprès de la FSS, et accompagnons
          l&rsquo;authentification de vos diplômes.
        </p>
      </div>

      <div className="section pw">
        <div className="two-col" style={{ alignItems: 'start' }}>
          <div className="doc-card">
            <h3>Pièces à fournir — un seul document PDF</h3>
            <ol>
              {PIECES.map((piece) => (
                <li key={piece.id}>{piece.content}</li>
              ))}
            </ol>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="callout warn">
              <span className="icn">⚠</span>
              <span>
                <strong>Plusieurs spécialités ?</strong> Les pièces 1 et 2 doivent être établies
                pour chaque spécialité demandée, sous peine de rejet du dossier.
              </span>
            </div>
            <div
              className="price-box"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}
            >
              <div style={{ fontSize: 12.5, color: 'var(--prod-ink-muted)' }}>À partir de</div>
              <div className="amt">
                50 000 <span className="cur">FCFA / spécialité</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--prod-ink-faint)' }}>
                Tarif multi-spécialités communiqué avant confirmation.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-bleed">
        <div className="section pw">
          <h2>Faire ma demande</h2>
          <p className="sub">3 étapes, environ 5 minutes.</p>
          <DemandForm />
        </div>
      </div>
    </div>
  );
}
