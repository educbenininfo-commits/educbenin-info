'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDossiersUnreadCount } from '@/lib/useDossiersUnreadCount';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';
import { FolderOpen, FolderX, LayoutGrid, LogOut, Menu, Settings } from 'lucide-react';
import { BACKOFFICE_NAV } from '@/lib/backoffice-nav';

// BO_BOTTOM_NAV / BO_MORE_ITEMS — educbenin-prototype.html, extended by
// 16-menu-mobile-bandeau.md. "Se déconnecter" calls the real
// /api/auth/logout (via AuthContext.logout) instead of just navigating to
// the login screen like the prototype.
//
// The "more" sheet's labels/hrefs all come from the single shared
// BACKOFFICE_NAV list (lib/backoffice-nav.ts, also used by
// BackofficeSidebar) — per 16's explicit "un seul jeu de libellés, pas
// deux maintenus séparément". Only the sheet's two-group split/order is
// specific to this component; filtering the shared array by key preserves
// its master order, which already matches the two groups below.
const BOTTOM_ITEMS = [
  { key: 'dashboard', href: '/admin/tableau-de-bord', icon: LayoutGrid, label: 'Bord' },
  { key: 'dossiers', href: '/admin/dossiers', icon: FolderOpen, label: 'Dossiers' },
];
const BOTTOM_ITEMS_AFTER_MORE = [
  { key: 'rejetes', href: '/admin/dossiers-rejetes', icon: FolderX, label: 'Rejetés' },
  { key: 'parametres', href: '/admin/parametres', icon: Settings, label: 'Réglages' },
];

const SHEET_GROUP_1_KEYS = ['statistiques', 'suggestions', 'contact'];
const SHEET_GROUP_2_KEYS = ['ecole-whatsapp', 'tarifs', 'comptes'];

export function BackofficeBottomNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const dossiersUnread = useDossiersUnreadCount();
  const { role } = useBackofficeAdmin();

  const sheetGroup1 = BACKOFFICE_NAV.filter((item) => SHEET_GROUP_1_KEYS.includes(item.key));
  const sheetGroup2 = BACKOFFICE_NAV.filter((item) => SHEET_GROUP_2_KEYS.includes(item.key));
  const sheetSuperadmin = BACKOFFICE_NAV.filter(
    (item) => item.superadminOnly && role === 'SUPERADMIN',
  );

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push('/connexion');
  }

  return (
    <>
      <nav className="bo-bottomnav">
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`p-bn-item${pathname === item.href ? ' on' : ''}`}
            onClick={() => setOpen(false)}
          >
            <span className="ic">
              <item.icon size={19} strokeWidth={1.9} />
              {item.key === 'dossiers' && dossiersUnread > 0 && (
                <span className="nav-badge nav-badge-icon">
                  {dossiersUnread > 99 ? '99+' : dossiersUnread}
                </span>
              )}
            </span>
            <span className="lbl">{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={`p-bn-item more${open ? ' on' : ''}`}
          title="Plus de pages"
          onClick={() => setOpen(!open)}
        >
          <span className="ic">
            <Menu size={20} />
          </span>
          <span className="lbl">Menu</span>
        </button>
        {BOTTOM_ITEMS_AFTER_MORE.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`p-bn-item${pathname === item.href ? ' on' : ''}`}
            onClick={() => setOpen(false)}
          >
            <span className="ic">
              <item.icon size={19} strokeWidth={1.9} />
            </span>
            <span className="lbl">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div
        className={`p-moresheet-ov${open ? ' show' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="p-moresheet">
          <div className="handle" />
          <div className="title">Menu back-office</div>
          {sheetGroup1.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setOpen(false)}>
              <span className="ic">
                <item.icon size={17} />
              </span>
              {item.label}
              {item.key === 'dossiers' && dossiersUnread > 0 && (
                <span className="nav-badge">{dossiersUnread > 99 ? '99+' : dossiersUnread}</span>
              )}
            </Link>
          ))}
          <div className="sep" />
          {sheetGroup2.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setOpen(false)}>
              <span className="ic">
                <item.icon size={17} />
              </span>
              {item.label}
            </Link>
          ))}
          {sheetSuperadmin.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setOpen(false)}>
              <span className="ic">
                <item.icon size={17} />
              </span>
              {item.label}
            </Link>
          ))}
          <div className="sep" />
          <button type="button" onClick={handleLogout}>
            <span className="ic">
              <LogOut size={17} />
            </span>
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}
