'use client';

// Real admin gate — GET /api/admin/me returns 200 (admin object) or
// 401/403. Pattern copied from examples/frontend-pages/admin/layout.tsx,
// the starter's own reference implementation. Renders the DESIGN-SPEC.md
// `.bo` shell (sidebar + mobile bottom nav + top bar) around every
// /admin/* page.
//
// Split out from layout.tsx (a Server Component) so that file can declare
// `export const metadata = { manifest: '/admin-manifest.webmanifest' }` —
// Next.js resolves per-segment metadata server-side and renders the
// correct <link rel="manifest"> in the initial HTML for every /admin/*
// page, no client-side DOM mutation required. Server Components can't
// carry 'use client' logic (hooks, state), hence this split.

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { BackofficeSidebar } from '@/components/backoffice/BackofficeSidebar';
import { BackofficeBottomNav } from '@/components/backoffice/BackofficeBottomNav';
import { BackofficeAdminProvider } from '@/contexts/BackofficeAdminContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PushSetup } from '@/components/pwa/PushSetup';

interface AdminMe {
  admin: { id: string; email: string; role: 'ADMIN' | 'SUPERADMIN' };
}

// The search box filters whatever list lives on the CURRENT admin page — it
// is not scoped to Dossiers. Each page reads the shared `?q=` URL param
// itself and filters its own rows (Dossiers/Dossiers rejetés via
// matchesDossierSearch in dossiers-data.ts; Spécialités/Tarifs/Comptes admin
// filter their own arrays server-side). Tableau de bord is the one
// exception — per product decision, its search box searches EVERY section
// at once (à la recherche Réglages iPhone) instead of just its own two
// widgets; see its page for the merged results view. Only Paramètres has no
// list to search, so it keeps the static "—" it always had.
const SEARCH_PLACEHOLDERS: Record<string, string> = {
  '/admin/dossiers': 'Rechercher un dossier (nom, référence, WhatsApp)…',
  '/admin/dossiers-rejetes': 'Rechercher un dossier rejeté…',
  '/admin/specialites': 'Rechercher une spécialité, une salle…',
  '/admin/tarifs': "Rechercher dans l'historique des tarifs…",
  '/admin/comptes-admin': 'Rechercher un membre…',
  '/admin/tableau-de-bord': 'Rechercher dans tout le back-office…',
};

function AdminSearchBox({ pathname }: { pathname: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (pathname === '/admin/parametres') {
    return <div className="bo-search">—</div>;
  }

  function updateQuery(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set('q', next);
    else params.delete('q');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <input
      key={pathname}
      className="bo-search"
      type="search"
      placeholder={SEARCH_PLACEHOLDERS[pathname] ?? 'Rechercher…'}
      defaultValue={searchParams.get('q') ?? ''}
      onChange={(e) => updateQuery(e.target.value)}
    />
  );
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminMe['admin'] | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api<AdminMe>('/api/admin/me');
        if (!cancelled) setAdmin(res.admin);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            router.replace('/connexion');
          } else {
            router.replace('/connexion');
          }
        }
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked || !admin) {
    return (
      <div
        className="prod"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: 'var(--prod-ink-muted)', fontSize: 13.5 }}>
          Vérification de l&rsquo;accès…
        </span>
      </div>
    );
  }

  return (
    <BackofficeAdminProvider admin={admin}>
      <PushSetup />
      <div className="prod bo">
        <BackofficeSidebar />
        <BackofficeBottomNav />
        <div className="bo-main">
          <div className="bo-top">
            <AdminSearchBox pathname={pathname} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ThemeToggle />
              <div className="bo-user">
                <div className="avatar">{admin.email.slice(0, 2).toUpperCase()}</div>
                {admin.email} ·{' '}
                {admin.role === 'SUPERADMIN' ? 'Super-administrateur' : 'Administrateur'}
              </div>
            </div>
          </div>
          <div className="bo-content">{children}</div>
        </div>
      </div>
    </BackofficeAdminProvider>
  );
}
