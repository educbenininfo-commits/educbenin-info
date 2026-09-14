'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchPublicEcoles, type PublicEcole } from '@/lib/ecoles-public-api';
import { ecoleSlug } from '@/lib/ecole-display';

// Panel content for the "École / Faculté" hover dropdown (see PublicNav's
// doc comment). Client component so the school list is always live —
// never baked into a statically-prerendered page — while the trigger
// link + hover CSS stay in the (static) parent for layout stability.
export function EcoleNavDropdown() {
  const [ecoles, setEcoles] = useState<PublicEcole[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicEcoles().then((items) => {
      if (!cancelled) setEcoles(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (ecoles.length === 0) return null;

  return (
    <div className="p-nav-dropdown-panel">
      {ecoles.map((ecole) => (
        <Link key={ecole.id} href={`/${ecoleSlug(ecole.nom)}`}>
          {ecole.nom}
          {ecole.description ? ` — ${ecole.description}` : ''}
        </Link>
      ))}
    </div>
  );
}
