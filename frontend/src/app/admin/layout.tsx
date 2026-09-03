'use client';

// Real admin gate — GET /api/admin/me returns 200 (admin object) or
// 401/403. Pattern copied from examples/frontend-pages/admin/layout.tsx,
// the starter's own reference implementation. Renders the DESIGN-SPEC.md
// `.bo` shell (sidebar + mobile bottom nav + top bar) around every
// /admin/* page.

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { BackofficeSidebar } from '@/components/backoffice/BackofficeSidebar';
import { BackofficeBottomNav } from '@/components/backoffice/BackofficeBottomNav';

interface AdminMe {
  admin: { id: string; email: string; role: 'ADMIN' | 'SUPERADMIN' };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
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
    <div className="prod bo">
      <BackofficeSidebar />
      <BackofficeBottomNav />
      <div className="bo-main">
        <div className="bo-top">
          <div className="bo-search">Rechercher…</div>
          <div className="bo-user">
            <div className="avatar">{admin.email.slice(0, 2).toUpperCase()}</div>
            {admin.email} ·{' '}
            {admin.role === 'SUPERADMIN' ? 'Super-administrateur' : 'Administrateur'}
          </div>
        </div>
        <div className="bo-content">{children}</div>
      </div>
    </div>
  );
}
