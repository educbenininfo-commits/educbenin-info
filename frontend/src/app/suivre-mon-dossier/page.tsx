// Écran Suivre mon dossier — docs/design-reference/DESIGN-SPEC.md, section
// "3. Suivre mon dossier". Contenu et structure reproduits à la lettre depuis
// docs/design-reference/educbenin-prototype.html.

import { HeroPanel } from '@/components/public/HeroPanel';
import { ClipboardCheck, FileCheck2 } from 'lucide-react';
import type { Metadata } from 'next';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { TrackingDemo } from '@/components/suivi/TrackingDemo';

export const metadata: Metadata = {
  title: 'Suivre mon dossier',
  description:
    "Retrouvez votre dossier de probatoire spécialité via votre référence et votre numéro WhatsApp, et suivez son état d'avancement étape par étape.",
  alternates: { canonical: '/suivre-mon-dossier' },
};

export default function SuiviPage() {
  return (
    <div className="prod">
      <PublicNav active="suivi" />
      <PublicBottomNav active="suivi" />

      <div className="page-head with-visual pw">
        <div>
          <div className="k">Suivi</div>
          <h1>Suivre mon dossier</h1>
          <p>Sans compte : saisissez votre référence de dossier et votre numéro WhatsApp.</p>
        </div>
        <HeroPanel
          hideOnMobile
          icon={ClipboardCheck}
          title="Exemple de suivi"
          subtitle="Référence EB-XXXXXX-XXX"
          variant="steps"
          rows={[
            { label: 'Dossier en cours de traitement', state: 'done' },
            { label: 'Authentification du diplôme', sub: 'Candidats étrangers', state: 'done' },
            { label: 'Inscription en ligne', state: 'now' },
            { label: 'Dépôt de dossier', state: 'next' },
            { label: 'Dossier déposé avec succès', state: 'next' },
          ]}
          floats={[
            {
              icon: FileCheck2,
              title: 'Preuve de dépôt',
              sub: 'Disponible à la fin',
              tone: 'success',
            },
          ]}
        />
      </div>

      <div className="pw content-pad">
        <TrackingDemo />
      </div>
    </div>
  );
}
