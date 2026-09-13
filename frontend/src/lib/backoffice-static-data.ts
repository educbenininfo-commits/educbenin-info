// Shared example data for the back-office screens that don't have a real
// backend yet (Tarifs' history — see that page's own header comment for why
// it stays static). Extracted here so the Tableau de bord's global search
// (see admin/tableau-de-bord/page.tsx) can search the same rows that page
// renders, instead of duplicating them.
//
// Comptes admin & rôles used to live here too (ADMIN_MEMBERS, 4 static
// example rows) — it's now backed by real data (GET /api/admin/team), see
// src/lib/admin-team-api.ts and src/components/backoffice/comptes-admin/.

export type TarifStatut = 'Actif' | 'Archivé';

export interface TarifHistoriqueRow {
  depuis: string;
  prix: string;
  regle: string;
  statut: TarifStatut;
}

export const TARIFS_HISTORIQUE: TarifHistoriqueRow[] = [
  { depuis: '01/09/2026', prix: '50 000 FCFA', regle: 'À définir', statut: 'Actif' },
  { depuis: '01/01/2026', prix: '45 000 FCFA', regle: '—', statut: 'Archivé' },
];
