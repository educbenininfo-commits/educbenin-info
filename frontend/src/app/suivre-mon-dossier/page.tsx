// Écran Suivre mon dossier — docs/design-reference/DESIGN-SPEC.md, section
// "3. Suivre mon dossier". Contenu et structure reproduits à la lettre depuis
// docs/design-reference/educbenin-prototype.html.

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

      <div className="page-head pw">
        <div className="k">Suivi</div>
        <h1>Suivre mon dossier</h1>
        <p>Sans compte : saisissez votre référence de dossier et votre numéro WhatsApp.</p>
      </div>

      <div className="pw content-pad">
        <TrackingDemo />
      </div>
    </div>
  );
}
