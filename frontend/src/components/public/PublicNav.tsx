import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';

// Desktop nav for public pages (DESIGN-SPEC.md > Fondations + per-screen
// "Layout & visual design"). `.p-links` and `.p-burger` are hidden under
// 760px via globals.css — mobile uses PublicBottomNav instead.
// `.p-burger` itself is a documented dead element in the prototype (always
// display:none in both modes) and is intentionally not reproduced here.

const LINKS: { key: string; href: string; label: string }[] = [
  { key: 'home', href: '/', label: 'Accueil' },
  { key: 'accompagnement', href: '/accompagnement', label: 'Accompagnement' },
  { key: 'specialites', href: '/specialites', label: 'Spécialités' },
  { key: 'suivi', href: '/suivre-mon-dossier', label: 'Suivre mon dossier' },
];

export function PublicNav({ active }: { active: string }) {
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
