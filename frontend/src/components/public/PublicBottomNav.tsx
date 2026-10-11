'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  GraduationCap,
  House,
  Mail,
  Menu,
  PenLine,
  School,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { fetchPublicEcoles, type PublicEcole } from '@/lib/ecoles-public-api';
import { ecoleSlug } from '@/lib/ecole-display';
import {
  OPEN_PUBLIC_MENU_EVENT,
  PUBLIC_NAV_STORAGE_KEY,
  applyPublicNavMode,
  isPublicNavMode,
  type PublicNavMode,
} from '@/lib/public-nav-mode';

// Mobile bottom nav + "more" sheet for public pages — extension
// multi-écoles, 2026-09 (16-menu-mobile-bandeau.md). Only visible under
// 760px (globals.css `.p-bottomnav`). Labels here MUST stay the single
// source of truth alongside the desktop nav (PublicNav.tsx) — the École
// list is fetched the same way (GET /api/ecoles, client-side) so a school
// added later appears in both without a second place to update.

const NAV_ITEMS: { key: string; href: string; icon: LucideIcon; label: string }[] = [
  { key: 'home', href: '/', icon: House, label: 'Accueil' },
  { key: 'accompagnement', href: '/accompagnement', icon: PenLine, label: 'Demande' },
];

const NAV_ITEMS_AFTER_MORE: { key: string; href: string; icon: LucideIcon; label: string }[] = [
  { key: 'ecole-toutes', href: '/ecoles', icon: GraduationCap, label: 'École' },
  { key: 'suivi', href: '/suivre-mon-dossier', icon: ClipboardCheck, label: 'Suivi' },
];

export function PublicBottomNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  const [ecoles, setEcoles] = useState<PublicEcole[]>([]);
  const ecoleActive = active === 'ecole-toutes' || active.startsWith('ecole-');
  const [mode, setMode] = useState<PublicNavMode>('bottom');

  // Site-wide placement chosen in the back-office (lib/public-nav-mode.ts):
  // start from the last known value, then refresh it from the server.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PUBLIC_NAV_STORAGE_KEY);
      if (isPublicNavMode(stored)) setMode(stored);
    } catch {
      /* storage blocked */
    }
    let cancelled = false;
    fetch('/api/site-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { publicNavMode?: unknown } | null) => {
        if (cancelled || !isPublicNavMode(s?.publicNavMode)) return;
        setMode(s.publicNavMode);
        applyPublicNavMode(s.publicNavMode);
      })
      .catch(() => {});
    const openMenu = () => setOpen(true);
    window.addEventListener(OPEN_PUBLIC_MENU_EVENT, openMenu);
    return () => {
      cancelled = true;
      window.removeEventListener(OPEN_PUBLIC_MENU_EVENT, openMenu);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchPublicEcoles().then((items) => {
      if (!cancelled) setEcoles(items);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <>
      <nav className="p-bottomnav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`p-bn-item${item.key === active ? ' on' : ''}`}
          >
            <span className="ic">
              <item.icon size={19} strokeWidth={1.9} />
            </span>
            <span className="lbl">{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="p-bn-item more"
          title="Plus de pages"
          onClick={() => setOpen(true)}
        >
          <span className="ic">
            <Menu size={20} />
          </span>
          <span className="lbl">Menu</span>
        </button>
        {NAV_ITEMS_AFTER_MORE.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`p-bn-item${item.key === active || (item.key === 'ecole-toutes' && ecoleActive) ? ' on' : ''}`}
          >
            <span className="ic">
              <item.icon size={19} strokeWidth={1.9} />
            </span>
            <span className="lbl">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div
        className={`p-moresheet-ov${open ? ' show' : ''}${mode === 'bottom' ? '' : ` drawer-${mode === 'top-left' ? 'left' : 'right'}`}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="p-moresheet">
          {mode === 'bottom' && <div className="handle" />}
          <div
            className="title"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            Menu Educ Bénin
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThemeToggle />
              {mode !== 'bottom' && (
                <button
                  type="button"
                  className="p-menu-close"
                  aria-label="Fermer le menu"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} />
                </button>
              )}
            </span>
          </div>
          {/* With the bottom bar visible, Accueil / Demande / École / Suivi are
              already one tap away there — the sheet only lists what the bar
              doesn't (each school, Contact). The side drawers (top modes)
              have no bar, so they list everything. */}
          {mode !== 'bottom' && (
            <>
              <Link href="/" onClick={() => setOpen(false)}>
                <span className="ic">
                  <House size={17} />
                </span>
                Accueil
              </Link>
              <div className="sep" />
              <Link href="/ecoles" onClick={() => setOpen(false)}>
                <span className="ic">
                  <GraduationCap size={17} />
                </span>
                Toutes les écoles
              </Link>
            </>
          )}
          {ecoles.map((ecole) => (
            <Link key={ecole.id} href={`/${ecoleSlug(ecole.nom)}`} onClick={() => setOpen(false)}>
              <span className="ic">
                <School size={17} />
              </span>
              École — {ecole.nom}
            </Link>
          ))}
          {mode !== 'bottom' && (
            <>
              <div className="sep" />
              <Link href="/accompagnement" onClick={() => setOpen(false)}>
                <span className="ic">
                  <PenLine size={17} />
                </span>
                Accompagnement (toutes les demandes)
              </Link>
              <Link href="/suivre-mon-dossier" onClick={() => setOpen(false)}>
                <span className="ic">
                  <ClipboardCheck size={17} />
                </span>
                Suivre mon dossier
              </Link>
            </>
          )}
          <div className="sep" />
          <Link href="/contact" onClick={() => setOpen(false)}>
            <span className="ic">
              <Mail size={17} />
            </span>
            Contact
          </Link>
        </div>
      </div>
    </>
  );
}
