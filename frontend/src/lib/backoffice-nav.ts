// BO_NAV — educbenin-prototype.html, extended by the multi-school prompts
// (10-13: Suggestions, École & WhatsApp renamed from Spécialités &
// WhatsApp). Real routes are prefixed with /admin (the prototype's urlMap
// put these on a separate back.educbenin.info subdomain, which this
// project isn't setting up — a plain path prefix avoids colliding with the
// public /specialites route instead).
//
// Single source of truth for both the desktop sidebar (BackofficeSidebar)
// and the mobile "more" sheet (BackofficeBottomNav) — per
// 16-menu-mobile-bandeau.md's explicit "un seul jeu de libellés, pas deux
// maintenus séparément".

export const BACKOFFICE_NAV: {
  key: string;
  href: string;
  icon: string;
  label: string;
  /** Hidden from ADMIN — only SUPERADMIN sees this item (e.g. Connexions). */
  superadminOnly?: boolean;
}[] = [
  { key: 'dashboard', href: '/admin/tableau-de-bord', icon: '◧', label: 'Tableau de bord' },
  { key: 'dossiers', href: '/admin/dossiers', icon: '▤', label: 'Dossiers' },
  { key: 'rejetes', href: '/admin/dossiers-rejetes', icon: '⊘', label: 'Dossiers rejetés' },
  { key: 'suggestions', href: '/admin/suggestions', icon: '✉', label: 'Suggestions' },
  { key: 'ecole-whatsapp', href: '/admin/ecole-whatsapp', icon: '☎', label: 'École & WhatsApp' },
  { key: 'tarifs', href: '/admin/tarifs', icon: '₣', label: 'Tarifs' },
  { key: 'comptes', href: '/admin/comptes-admin', icon: '◎', label: 'Comptes admin & rôles' },
  {
    key: 'connexions',
    href: '/admin/connexions',
    icon: '⏻',
    label: 'Connexions',
    superadminOnly: true,
  },
  { key: 'parametres', href: '/admin/parametres', icon: '⚙', label: 'Paramètres' },
];
