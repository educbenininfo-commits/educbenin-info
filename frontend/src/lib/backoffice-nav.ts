// BO_NAV — educbenin-prototype.html. Real routes are prefixed with /admin
// (the prototype's urlMap put these on a separate back.educbenin.bj
// subdomain, which this project isn't setting up — a plain path prefix
// avoids colliding with the public /specialites route instead).

export const BACKOFFICE_NAV: { key: string; href: string; icon: string; label: string }[] = [
  { key: 'dashboard', href: '/admin/tableau-de-bord', icon: '◧', label: 'Tableau de bord' },
  { key: 'dossiers', href: '/admin/dossiers', icon: '▤', label: 'Dossiers' },
  { key: 'rejetes', href: '/admin/dossiers-rejetes', icon: '⊘', label: 'Dossiers rejetés' },
  {
    key: 'specialites-admin',
    href: '/admin/specialites',
    icon: '☎',
    label: 'Spécialités & WhatsApp',
  },
  { key: 'tarifs', href: '/admin/tarifs', icon: '₣', label: 'Tarifs' },
  { key: 'comptes', href: '/admin/comptes-admin', icon: '◎', label: 'Comptes admin & rôles' },
  { key: 'parametres', href: '/admin/parametres', icon: '⚙', label: 'Paramètres' },
];
