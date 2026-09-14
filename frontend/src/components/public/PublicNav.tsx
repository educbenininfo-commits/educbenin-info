import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';
import { EcoleNavDropdown } from '@/components/public/EcoleNavDropdown';

// Desktop nav for public pages — single shared component, every public page
// renders this (never a page-local copy) so the menu is identical
// everywhere. `.p-links` and `.p-burger` are hidden under 760px via
// globals.css — mobile uses PublicBottomNav instead (see
// 16-menu-mobile-bandeau.md, not covered here).
//
// "École / Faculté" (extension multi-écoles, 2026-09) is a hover-only
// dropdown (CSS-only reveal, see .p-nav-dropdown in globals.css) listing
// every Ecole row from the DB — never a hardcoded FSS/INMeS pair — so a
// school added later via the back-office appears automatically, no
// redeploy needed. The live list is fetched client-side by
// EcoleNavDropdown via GET /api/ecoles rather than read here directly:
// most pages using this nav (Accueil, Accompagnement, …) are statically
// prerendered, so a direct Prisma read here would freeze the school list
// to whatever existed at the last build.
//
// Routing: the trigger links to /ecoles ("Toutes les écoles"); each school
// links to /<nom lowercased> at the ROOT (e.g. /fss, /inmes — confirmed by
// the 02-08 reference screenshots' browser chrome, not nested under
// /ecoles/) — Ecole has no dedicated `slug` field (not part of the locked
// data-model spec), so `nom.toLowerCase()` is the routing key.

const LINKS: { key: string; href: string; label: string }[] = [
  { key: 'home', href: '/', label: 'Accueil' },
];
const LINKS_AFTER_ECOLE: { key: string; href: string; label: string }[] = [
  { key: 'accompagnement', href: '/accompagnement', label: 'Accompagnement' },
  { key: 'suivi', href: '/suivre-mon-dossier', label: 'Suivre mon dossier' },
];

export function PublicNav({ active }: { active: string }) {
  // "active" for École/Faculté covers the listing page and every school
  // page — future prompts (02/03/04) should pass active="ecole".
  const ecoleActive = active === 'ecole' || active.startsWith('ecole-');

  return (
    <div className="nav-bleed">
      <div className="p-nav pw">
        <Link href="/" className="p-logo">
          <EducBeninLogo height={32} />
        </Link>
        <div className="p-links">
          {LINKS.map((link) => (
            <Link key={link.key} href={link.href} className={link.key === active ? 'on' : ''}>
              {link.label}
            </Link>
          ))}
          <div className="p-nav-dropdown">
            <Link href="/ecoles" className={ecoleActive ? 'on' : ''}>
              École / Faculté <span className="p-nav-dropdown-caret">▾</span>
            </Link>
            <EcoleNavDropdown />
          </div>
          {LINKS_AFTER_ECOLE.map((link) => (
            <Link key={link.key} href={link.href} className={link.key === active ? 'on' : ''}>
              {link.label}
            </Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ThemeToggle />
          <Link href="/accompagnement" className="btn btn-primary btn-sm">
            Faire ma demande
          </Link>
        </div>
      </div>
    </div>
  );
}
