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
import { ExternalLink, LogOut, Menu, Search } from 'lucide-react';
import { useBoNavMode } from '@/lib/bo-nav-mode';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMaintenanceState } from '@/lib/admin-maintenance-api';
import { clearOffline, readOffline, writeOffline } from '@/lib/offline-cache';

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
  '/admin/suggestions': 'Rechercher une suggestion…',
  '/admin/ecole-whatsapp': 'Rechercher une école, une filière…',
  '/admin/tarifs': "Rechercher dans l'historique des tarifs…",
  '/admin/comptes-admin': 'Rechercher un membre…',
  '/admin/connexions': 'Rechercher une connexion (nom, e-mail)…',
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
  const [maintenance, setMaintenance] = useState(false);
  const navMode = useBoNavMode();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push('/connexion');
  }

  useEffect(() => {
    if (!admin) return;
    void fetchMaintenanceState()
      .then((r) => setMaintenance(r.enabled))
      .catch(() => setMaintenance(false));
  }, [admin]);

  useEffect(() => {
    let cancelled = false;
    // Installed-app instant paint: open straight onto the shell with the
    // identity kept from the last session, then confirm it with the server.
    // A refused session wipes the device copy and goes to /connexion; a
    // network failure keeps the cached shell (offline) when there is one.
    const cachedAdmin = readOffline<AdminMe['admin']>('admin-me');
    if (cachedAdmin) {
      setAdmin(cachedAdmin);
      setChecked(true);
    }
    void (async () => {
      try {
        const res = await api<AdminMe>('/api/admin/me');
        if (!cancelled) {
          setAdmin(res.admin);
          writeOffline('admin-me', res.admin);
        }
      } catch (err) {
        if (!cancelled) {
          const refused = err instanceof ApiError && (err.status === 401 || err.status === 403);
          if (refused || !cachedAdmin) {
            clearOffline();
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
      <div className={`prod bo nav-${navMode}`}>
        <BackofficeSidebar mobileOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        {drawerOpen && <div className="bo-drawer-ov" onClick={() => setDrawerOpen(false)} />}
        <BackofficeBottomNav />
        <div className="bo-main">
          <header className="bo-top">
            <button
              type="button"
              className="btn-icon bo-burger"
              aria-label="Ouvrir le menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu />
            </button>
            <div className="bo-top-site">
              <img src="/logo/mark.svg" alt="" className="mark" />
              <span className="txt">
                <strong>Educ Bénin</strong>
                <small className={maintenance ? 'maint' : 'live'}>
                  <i /> {maintenance ? 'Maintenance' : 'En ligne'}
                </small>
              </span>
            </div>
            <div className="bo-search-wrap">
              <Search size={16} aria-hidden="true" />
              <AdminSearchBox pathname={pathname} />
            </div>
            <div className="bo-top-actions">
              <ThemeToggle />
              <a
                className="btn-icon"
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                title="Voir le site"
                aria-label="Voir le site"
              >
                <ExternalLink />
              </a>
              <div className="bo-user" title={admin.email}>
                <div className="avatar">{admin.email.slice(0, 2).toUpperCase()}</div>
                <span className="who">
                  <strong>{admin.email.split('@')[0]}</strong>
                  <small>
                    {admin.role === 'SUPERADMIN' ? 'Super-administrateur' : 'Administrateur'}
                  </small>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm bo-logout"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>Se déconnecter</span>
              </button>
            </div>
          </header>
          <div className="bo-content">{children}</div>
        </div>
      </div>
    </BackofficeAdminProvider>
  );
}
