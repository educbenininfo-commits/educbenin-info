'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, ExternalLink, Globe, ArrowRight, X } from 'lucide-react';
import { BACKOFFICE_NAV } from '@/lib/backoffice-nav';
import { useDossiersUnreadCount } from '@/lib/useDossiersUnreadCount';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';

export function BackofficeSidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const dossiersUnread = useDossiersUnreadCount();
  const { role } = useBackofficeAdmin();
  const navItems = BACKOFFICE_NAV.filter((item) => !item.superadminOnly || role === 'SUPERADMIN');

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('bo-sidebar-collapsed') === '1') setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed(!collapsed);
    localStorage.setItem('bo-sidebar-collapsed', !collapsed ? '1' : '0');
  }

  return (
    <aside className={`bo-side${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="bo-side-head">
        <Link href="/admin/tableau-de-bord" className="bo-logo" aria-label="Tableau de bord">
          {collapsed ? (
            <img src="/logo/mark.svg" alt="Educ Bénin" style={{ height: 30, width: 30 }} />
          ) : (
            <EducBeninLogo height={28} />
          )}
        </Link>
        {onClose && (
          <button
            type="button"
            className="btn-icon bo-drawer-close"
            aria-label="Fermer le menu"
            onClick={onClose}
          >
            <X />
          </button>
        )}
        {!collapsed && (
          <a className="bo-site-pill" href="/" target="_blank" rel="noopener noreferrer">
            <Globe size={14} />
            Le site
          </a>
        )}
      </div>

      <div className="bo-side-scroll">
        <button
          onClick={toggle}
          type="button"
          className="bo-collapse-btn"
          title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed && <span>Réduire le menu</span>}
        </button>

        <nav className="bo-nav">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const startsSection = item.section && item.section !== navItems[i - 1]?.section;
            const active = pathname === item.href;
            return (
              <Fragment key={item.key}>
                {startsSection &&
                  (collapsed ? (
                    <div className="bo-section-sep" />
                  ) : (
                    <div className="bo-section">{item.section}</div>
                  ))}
                <Link
                  href={item.href}
                  className={`bo-item${active ? ' on' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="ic">
                    <Icon size={18} strokeWidth={1.9} />
                  </span>
                  {!collapsed && <span className="lbl">{item.label}</span>}
                  {item.key === 'dossiers' && dossiersUnread > 0 && (
                    <span className="nav-badge">
                      {dossiersUnread > 99 ? '99+' : dossiersUnread}
                    </span>
                  )}
                </Link>
              </Fragment>
            );
          })}
        </nav>
      </div>

      <div className="bo-side-foot">
        <a
          className="bo-foot-card"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? 'Voir le site public' : undefined}
        >
          <span className="ic">
            <ExternalLink size={17} />
          </span>
          {!collapsed && (
            <span className="txt">
              <strong>
                Voir le site <ArrowRight size={13} />
              </strong>
              <small>Accueil, écoles et accompagnement</small>
            </span>
          )}
        </a>
      </div>
    </aside>
  );
}
