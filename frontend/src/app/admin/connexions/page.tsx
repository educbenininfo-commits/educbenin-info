// Écran Connexions — nouveau, hors DESIGN-SPEC.md (fonctionnalité ajoutée
// après coup). Réutilise les classes/styles déjà établis pour les autres
// tableaux back-office (dtable/tablewrap/pill/hint, cf. TeamList.tsx) pour
// rester visuellement cohérent avec le reste du produit.

import { ConnexionsList } from '@/components/backoffice/connexions/ConnexionsList';

export default function ConnexionsPage() {
  return <ConnexionsList />;
}
