'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mobile bottom nav + "more" sheet for public pages (DESIGN-SPEC.md > Fondations
// "Barre de menu mobile du bas" + "Feuille plus (bottom sheet)", and per-screen
// "Responsive / mobile differences" > PUBLIC_NAV / PUBLIC_MORE_ITEMS in
// educbenin-prototype.html). Icons are the exact literal glyphs from the
// prototype (rendered as text, not SVG assets — that's how the source renders
// them too). Only visible under 760px (globals.css `.p-bottomnav`).

const NAV_ITEMS: { key: string; href: string; icon: string; label: string }[] = [
  { key: 'home', href: '/', icon: '⌂', label: 'Accueil' },
  { key: 'accompagnement', href: '/accompagnement', icon: '✎', label: 'Demande' },
];

const NAV_ITEMS_AFTER_MORE: { key: string; href: string; icon: string; label: string }[] = [
  { key: 'specialites', href: '/specialites', icon: '◧', label: 'Spécialités' },
  { key: 'suivi', href: '/suivre-mon-dossier', icon: '◔', label: 'Suivi' },
];

const MORE_ITEMS: { key: string; href: string; icon: string; label: string; sep?: false }[] = [
  { key: 'home', href: '/', icon: '⌂', label: 'Accueil' },
  { key: 'accompagnement', href: '/accompagnement', icon: '✎', label: 'Accompagnement' },
  { key: 'specialites', href: '/specialites', icon: '◧', label: 'Spécialités' },
  { key: 'suivi', href: '/suivre-mon-dossier', icon: '◔', label: 'Suivre mon dossier' },
];

const MORE_ITEMS_LEGAL: { key: string; href: string; icon: string; label: string }[] = [
  { key: 'mentions', href: '/mentions-legales', icon: '§', label: 'Mentions légales' },
  { key: 'cgv', href: '/cgu-cgv', icon: '§', label: 'CGU / CGV' },
  {
    key: 'confidentialite',
    href: '/confidentialite',
    icon: '§',
    label: 'Politique de confidentialité',
  },
];

export function PublicBottomNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);

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
            className={`p-bn-item${item.key === active ? ' on' : ''}`}
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
          <div className="title">Menu Educ Bénin</div>
          {MORE_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setOpen(false)}>
              <span className="ic">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <div className="sep" />
          {MORE_ITEMS_LEGAL.map((item) => (
            <Link key={item.key} href={item.href} onClick={() => setOpen(false)}>
              <span className="ic">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <div className="sep" />
          <Link href="/connexion" onClick={() => setOpen(false)}>
            <span className="ic">⇥</span>
            Accès back-office
          </Link>
        </div>
      </div>
    </>
  );
}
