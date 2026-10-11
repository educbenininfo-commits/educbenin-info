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
  section?: 'Analyse' | 'Dossiers' | 'Échanges' | 'Contenu' | 'Réglages';
  /** Hidden from ADMIN — only SUPERADMIN sees this item (e.g. Connexions). */
  superadminOnly?: boolean;
}

export const BACKOFFICE_NAV: BackofficeNavItem[] = [
  { key: 'dashboard', href: '/admin/tableau-de-bord', icon: LayoutGrid, label: 'Tableau de bord' },
  {
    key: 'statistiques',
    href: '/admin/statistiques',
    icon: BarChart3,
    label: 'Statistiques',
    section: 'Analyse',
  },
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
    key: 'suggestions',
    href: '/admin/suggestions',
    icon: Lightbulb,
    label: 'Suggestions',
    section: 'Échanges',
  },
  {
    key: 'contact',
    href: '/admin/contact',
    icon: Inbox,
    label: 'Contact & messages',
    section: 'Échanges',
  },
  {
    key: 'ecole-whatsapp',
    href: '/admin/ecole-whatsapp',
    icon: GraduationCap,
    label: 'École & WhatsApp',
    section: 'Contenu',
  },
  { key: 'tarifs', href: '/admin/tarifs', icon: Banknote, label: 'Tarifs', section: 'Contenu' },
  {
    key: 'comptes',
    href: '/admin/comptes-admin',
    icon: Users,
    label: 'Comptes admin & rôles',
    section: 'Réglages',
  },
  {
    key: 'connexions',
    href: '/admin/connexions',
    icon: Activity,
    label: 'Connexions',
    section: 'Réglages',
    superadminOnly: true,
  },
  {
    key: 'parametres',
    href: '/admin/parametres',
    icon: Settings,
    label: 'Paramètres',
    section: 'Réglages',
  },
];
