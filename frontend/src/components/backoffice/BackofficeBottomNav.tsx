'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// BO_BOTTOM_NAV / BO_MORE_ITEMS — educbenin-prototype.html. "Se déconnecter"
// calls the real /api/auth/logout (via AuthContext.logout) instead of just
// navigating to the login screen like the prototype — this session wired
// real authentication for the back-office per product decision.

const BOTTOM_ITEMS = [
  { key: 'dashboard', href: '/admin/tableau-de-bord', icon: '◧', label: 'Bord' },
  { key: 'dossiers', href: '/admin/dossiers', icon: '▤', label: 'Dossiers' },
];
const BOTTOM_ITEMS_AFTER_MORE = [
  { key: 'rejetes', href: '/admin/dossiers-rejetes', icon: '⊘', label: 'Rejetés' },
  { key: 'parametres', href: '/admin/parametres', icon: '⚙', label: 'Réglages' },
];

const MORE_ITEMS = [
  { key: 'dashboard', href: '/admin/tableau-de-bord', icon: '◧', label: 'Tableau de bord' },
  { key: 'dossiers', href: '/admin/dossiers', icon: '▤', label: 'Dossiers' },
  { key: 'rejetes', href: '/admin/dossiers-rejetes', icon: '⊘', label: 'Dossiers rejetés' },
  { key: 'parametres', href: '/admin/parametres', icon: '⚙', label: 'Paramètres' },
];
const MORE_ITEMS_2 = [
  {
    key: 'specialites-admin',
    href: '/admin/specialites',
    icon: '☎',
    label: 'Spécialités & WhatsApp',
  },
  { key: 'tarifs', href: '/admin/tarifs', icon: '₣', label: 'Tarifs' },
  { key: 'comptes', href: '/admin/comptes-admin', icon: '◎', label: 'Comptes admin & rôles' },
];

export function BackofficeBottomNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

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
          >
            <span className="ic">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="p-bn-item more"
          title="Plus de pages"
          onClick={() => setOpen(true)}
        >
          <span className="ic">☰</span>
          <span>Menu</span>
        </button>
        {BOTTOM_ITEMS_AFTER_MORE.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`p-bn-item${pathname === item.href ? ' on' : ''}`}
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
          {MORE_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setOpen(false)}>
              <span className="ic">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <div className="sep" />
          {MORE_ITEMS_2.map((item) => (
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
