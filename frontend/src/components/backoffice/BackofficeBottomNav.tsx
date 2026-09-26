'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDossiersUnreadCount } from '@/lib/useDossiersUnreadCount';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';
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
  { key: 'dashboard', href: '/admin/tableau-de-bord', icon: '◧', label: 'Bord' },
  { key: 'dossiers', href: '/admin/dossiers', icon: '▤', label: 'Dossiers' },
];
const BOTTOM_ITEMS_AFTER_MORE = [
  { key: 'rejetes', href: '/admin/dossiers-rejetes', icon: '⊘', label: 'Rejetés' },
  { key: 'parametres', href: '/admin/parametres', icon: '⚙', label: 'Réglages' },
];

const SHEET_GROUP_1_KEYS = ['suggestions'];
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
              {item.icon}
              {item.key === 'dossiers' && dossiersUnread > 0 && (
                <span className="nav-badge nav-badge-icon">
                  {dossiersUnread > 99 ? '99+' : dossiersUnread}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={`p-bn-item more${open ? ' on' : ''}`}
          title="Plus de pages"
          onClick={() => setOpen(!open)}
        >
          <span className="ic">☰</span>
          <span>Menu</span>
        </button>
        {BOTTOM_ITEMS_AFTER_MORE.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`p-bn-item${pathname === item.href ? ' on' : ''}`}
            onClick={() => setOpen(false)}
          >
            <span className="ic">{item.icon}</span>
            <span>{item.label}</span>
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
              <span className="ic">{item.icon}</span>
              {item.label}
              {item.key === 'dossiers' && dossiersUnread > 0 && (
                <span className="nav-badge">{dossiersUnread > 99 ? '99+' : dossiersUnread}</span>
              )}
            </Link>
          ))}
          <div className="sep" />
          {sheetGroup2.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setOpen(false)}>
              <span className="ic">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {sheetSuperadmin.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setOpen(false)}>
              <span className="ic">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <div className="sep" />
          <button type="button" onClick={handleLogout}>
            <span className="ic">⇥</span>
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}
