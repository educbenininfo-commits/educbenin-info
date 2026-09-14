'use client';

// Composant transverse (14-liste-grille-toggle.md) — construit une seule
// fois, appliqué aux écrans Dossiers, Suggestions, École & WhatsApp,
// historique des Tarifs (Dossiers rejetés et Comptes admin restent
// inchangés, non concernés). Purement présentationnel : ne touche jamais
// aux filtres/recherche déjà appliqués par l'écran parent, qui garde son
// propre state de données et choisit simplement quel rendu (tableau ou
// cartes) faire du même jeu de résultats déjà filtré.
export type ViewMode = 'list' | 'grid';

export function ListGridToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="lg-toggle" role="group" aria-label="Affichage">
      <button
        type="button"
        className={mode === 'list' ? 'on' : ''}
        onClick={() => onChange('list')}
      >
        Liste
      </button>
      <button
        type="button"
        className={mode === 'grid' ? 'on' : ''}
        onClick={() => onChange('grid')}
      >
        Grille
      </button>
    </div>
  );
}
