// Back-office navigation — single source of truth for both the desktop
// sidebar (BackofficeSidebar) and the mobile "Menu" sheet
// (BackofficeBottomNav): one set of labels, never two maintained separately.
// Real routes are prefixed with /admin.
import {
  Activity,
  BarChart3,
  Banknote,
  FolderOpen,
  FolderX,
  GraduationCap,
  Inbox,
  LayoutGrid,
  Lightbulb,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface BackofficeNavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  label: string;
  /** Sidebar group heading; items without one sit above the first group. */
  section?: 'Dossiers' | 'Messages' | 'Pilotage' | 'Contenu du site' | 'Administration';
  /** Hidden from ADMIN — only SUPERADMIN sees this item (e.g. Connexions). */
  superadminOnly?: boolean;
}

// Ordered by how often the team uses each screen: daily case work first
// (dossiers, then incoming messages), then periodic monitoring
// (statistiques), then rarely-edited site content, and account/team
// administration last.
export const BACKOFFICE_NAV: BackofficeNavItem[] = [
  { key: 'dashboard', href: '/admin/tableau-de-bord', icon: LayoutGrid, label: 'Tableau de bord' },
  {
    key: 'dossiers',
    href: '/admin/dossiers',
    icon: FolderOpen,
    label: 'Dossiers',
    section: 'Dossiers',
  },
  {
    key: 'rejetes',
    href: '/admin/dossiers-rejetes',
    icon: FolderX,
    label: 'Dossiers rejetés',
    section: 'Dossiers',
  },
  {
    key: 'contact',
    href: '/admin/contact',
    icon: Inbox,
    label: 'Contact & messages',
    section: 'Messages',
  },
  {
    key: 'suggestions',
    href: '/admin/suggestions',
    icon: Lightbulb,
    label: 'Suggestions',
    section: 'Messages',
  },
  {
    key: 'statistiques',
    href: '/admin/statistiques',
    icon: BarChart3,
    label: 'Statistiques',
    section: 'Pilotage',
  },
  {
    key: 'ecole-whatsapp',
    href: '/admin/ecole-whatsapp',
    icon: GraduationCap,
    label: 'École & WhatsApp',
    section: 'Contenu du site',
  },
  {
    key: 'tarifs',
    href: '/admin/tarifs',
    icon: Banknote,
    label: 'Tarifs',
    section: 'Contenu du site',
  },
  {
    key: 'comptes',
    href: '/admin/comptes-admin',
    icon: Users,
    label: 'Comptes admin & rôles',
    section: 'Administration',
  },
  {
    key: 'connexions',
    href: '/admin/connexions',
    icon: Activity,
    label: 'Connexions',
    section: 'Administration',
    superadminOnly: true,
  },
  {
    key: 'parametres',
    href: '/admin/parametres',
    icon: Settings,
    label: 'Paramètres',
    section: 'Administration',
  },
];
