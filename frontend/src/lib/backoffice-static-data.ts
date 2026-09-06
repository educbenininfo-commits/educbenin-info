// Shared example data for the back-office screens that don't have a real
// backend yet (Tarifs' history, Comptes admin's member list — see each
// page's own header comment for why they stay static). Extracted here so
// the Tableau de bord's global search (see admin/tableau-de-bord/page.tsx)
// can search the same rows those pages render, instead of duplicating them.

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

export type AdminPerm = 'manage' | 'read' | 'none';

export interface AdminMemberRow {
  name: string;
  perms: [AdminPerm, AdminPerm, AdminPerm, AdminPerm, AdminPerm];
}

export const ADMIN_MEMBERS: AdminMemberRow[] = [
  { name: 'Horace L. — Fondateur', perms: ['manage', 'manage', 'manage', 'manage', 'manage'] },
  {
    name: 'Chimène A. — Agent de traitement',
    perms: ['manage', 'manage', 'read', 'none', 'none'],
  },
  {
    name: 'Roméo K. — Agent authentification',
    perms: ['manage', 'read', 'none', 'none', 'none'],
  },
  { name: 'Estelle D. — Supervision', perms: ['manage', 'manage', 'manage', 'read', 'none'] },
];
