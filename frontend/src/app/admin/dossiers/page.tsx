// Écran Dossiers — docs/design-reference/DESIGN-SPEC.md, section
// "10. Dossiers". Layout, copy et données d'exemple (les 10 dossiers)
// reproduits à la lettre depuis docs/design-reference/educbenin-prototype.html.
// State is client-side only (React), matching the prototype's in-memory
// DOSSIERS object — no "dossier" model exists in Prisma yet.

import { DossiersList } from '@/components/backoffice/dossiers/DossiersList';

export default function DossiersPage() {
  return (
    <>
      <h3 className="bo-h1">Dossiers</h3>
      <div className="bo-sub">
        Filtrez par étape, puis cliquez sur un dossier pour l&rsquo;ouvrir — les actions disponibles
        dépendent de son étape.
      </div>
      <DossiersList />
    </>
  );
}
