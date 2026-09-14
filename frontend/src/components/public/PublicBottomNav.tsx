'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { fetchPublicEcoles, type PublicEcole } from '@/lib/ecoles-public-api';
import { ecoleSlug } from '@/lib/ecole-display';

// Mobile bottom nav + "more" sheet for public pages — extension
// multi-écoles, 2026-09 (16-menu-mobile-bandeau.md). Only visible under
// 760px (globals.css `.p-bottomnav`). Labels here MUST stay the single
// source of truth alongside the desktop nav (PublicNav.tsx) — the École
// list is fetched the same way (GET /api/ecoles, client-side) so a school
// added later appears in both without a second place to update.

const NAV_ITEMS: { key: string; href: string; icon: string; label: string }[] = [
  { key: 'home', href: '/', icon: '⌂', label: 'Accueil' },
  { key: 'accompagnement', href: '/accompagnement', icon: '✎', label: 'Demande' },
];

const NAV_ITEMS_AFTER_MORE: { key: string; href: string; icon: string; label: string }[] = [
  { key: 'ecole-toutes', href: '/ecoles', icon: '◧', label: 'École' },
  { key: 'suivi', href: '/suivre-mon-dossier', icon: '◔', label: 'Suivi' },
];

export function PublicBottomNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  const [ecoles, setEcoles] = useState<PublicEcole[]>([]);
  const ecoleActive = active === 'ecole-toutes' || active.startsWith('ecole-');

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
        {NAV_ITEMS_AFTER_MORE.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`p-bn-item${item.key === active || (item.key === 'ecole-toutes' && ecoleActive) ? ' on' : ''}`}
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
          <div
            className="title"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            Menu Educ Bénin
            <ThemeToggle />
          </div>
          <Link href="/" onClick={() => setOpen(false)}>
            <span className="ic">⌂</span>
            Accueil
          </Link>
          <div className="sep" />
          <Link href="/ecoles" onClick={() => setOpen(false)}>
            <span className="ic">◧</span>
            Toutes les écoles
          </Link>
          {ecoles.map((ecole) => (
            <Link key={ecole.id} href={`/${ecoleSlug(ecole.nom)}`} onClick={() => setOpen(false)}>
              <span className="ic">▫</span>
              École — {ecole.nom}
            </Link>
          ))}
          <div className="sep" />
          <Link href="/accompagnement" onClick={() => setOpen(false)}>
            <span className="ic">✎</span>
            Accompagnement (toutes les demandes)
          </Link>
          <Link href="/suivre-mon-dossier" onClick={() => setOpen(false)}>
            <span className="ic">◔</span>
            Suivre mon dossier
          </Link>
        </div>
      </div>
    </>
  );
}
