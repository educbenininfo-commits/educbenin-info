'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BACKOFFICE_NAV } from '@/lib/backoffice-nav';
import { useDossiersUnreadCount } from '@/lib/useDossiersUnreadCount';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';

export function BackofficeSidebar() {
  const pathname = usePathname();
  const dossiersUnread = useDossiersUnreadCount();
  const { role } = useBackofficeAdmin();
  const navItems = BACKOFFICE_NAV.filter((item) => !item.superadminOnly || role === 'SUPERADMIN');

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('bo-sidebar-collapsed');
    if (saved === '1') setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed(!collapsed);
    localStorage.setItem('bo-sidebar-collapsed', !collapsed ? '1' : '0');
  }

  // Prevent hydration mismatch on the first render by relying on CSS for the collapsed state
  // or by rendering it correctly after mount. But applying a class based on state is fine.
  // The transition will just happen if it was collapsed.

  return (
    <aside className={`bo-side${collapsed ? ' collapsed' : ''}`}>
      <div
        className="bo-brand"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'flex-start',
          gap: 16,
          paddingBottom: 24,
        }}
      >
        <img
          src={collapsed ? '/logo/mark.svg' : '/logo/lockup-dark.svg'}
          alt="Educ Bénin"
          height={26}
          style={{ height: 26, width: 'auto' }}
        />
        <button
          onClick={toggle}
          type="button"
          className="bo-collapse-btn"
          style={{ alignSelf: collapsed ? 'center' : 'flex-end' }}
          title={collapsed ? 'Déplier' : 'Réduire'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {collapsed ? (
              <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
                <path d="M8 12l4-4" />
                <path d="M8 12l4 4" />
              </>
            ) : (
              <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
                <path d="M16 12l-4-4" />
                <path d="M16 12l-4 4" />
              </>
            )}
          </svg>
          {!collapsed && (
            <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 500 }}>Réduire</span>
          )}
        </button>
      </div>
      {navItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`bo-item${pathname === item.href ? ' on' : ''}`}
          title={collapsed ? item.label : undefined}
        >
          <span className="ic">{item.icon}</span>
          {!collapsed && <span className="lbl">{item.label}</span>}
          {item.key === 'dossiers' && dossiersUnread > 0 && (
            <span className="nav-badge">{dossiersUnread > 99 ? '99+' : dossiersUnread}</span>
          )}
        </Link>
      ))}
    </aside>
  );
}
