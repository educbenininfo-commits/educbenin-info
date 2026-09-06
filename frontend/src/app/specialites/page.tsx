// Écran Spécialités — docs/design-reference/DESIGN-SPEC.md, section
// "4. Spécialités". Contenu et structure reproduits à la lettre depuis
// docs/design-reference/educbenin-prototype.html.

import type { Metadata } from 'next';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { SpecialtyGrid } from '@/components/specialites/SpecialtyGrid';

export const metadata: Metadata = {
  title: 'Les 27 spécialités du D.E.S. de la FSS',
  description:
    "Liste des 27 spécialités du D.E.S. de la FSS avec, pour chacune, la date, l'heure et la salle d'examen, et l'accès aux communautés WhatsApp.",
  alternates: { canonical: '/specialites' },
};

export default function SpecialitesPage() {
  return (
    <div className="prod">
      <PublicNav active="specialites" />
      <PublicBottomNav active="specialites" />

      <div className="page-head pw">
        <div className="k">Année scolaire 2026-2027</div>
        <h1>Les 27 spécialités du D.E.S. — FSS</h1>
        <p>
          Sélectionnez une spécialité pour voir la date, le lieu de composition et rejoindre les
          communautés WhatsApp.
        </p>
      </div>

      <div className="pw content-pad">
        <SpecialtyGrid />
        <div
          style={{ marginTop: 16, fontSize: 11.5, color: 'var(--prod-ink-faint)', lineHeight: 1.6 }}
        >
          GAM/FSS = Grand Amphi Médecine (FSS) · A2/FSS = Amphi 2 Médecine (FSS) · A5/FSS = Amphi 5
          ESAS · CNHU-HKM et LAZARET = sites hors campus FSS.
        </div>
      </div>
    </div>
  );
}
