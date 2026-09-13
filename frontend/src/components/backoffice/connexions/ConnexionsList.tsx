'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';
import { fetchAuthEvents, type AuthEventRow } from '@/lib/admin-connexions-api';

function actionLabel(action: AuthEventRow['action']): string {
  return action === 'auth.login' ? 'Connexion' : 'Déconnexion';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function matchesQuery(row: AuthEventRow, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const email = row.metadata?.email ?? '';
  const name = row.metadata?.name ?? '';
  return email.toLowerCase().includes(q) || name.toLowerCase().includes(q);
}

export function ConnexionsList() {
  const { role } = useBackofficeAdmin();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [rows, setRows] = useState<AuthEventRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchAuthEvents();
      setRows(page.items);
      setCursor(page.nextCursor);
    } catch {
      setError('Impossible de charger les connexions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'SUPERADMIN') void loadFirstPage();
  }, [role, loadFirstPage]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchAuthEvents(cursor);
      setRows((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setError('Impossible de charger la suite.');
    } finally {
      setLoadingMore(false);
    }
  }

  if (role !== 'SUPERADMIN') {
    return (
      <div>
        <h3 className="bo-h1" style={{ marginBottom: 2 }}>
          Connexions
        </h3>
        <p className="hint" style={{ marginTop: 10 }}>
          Réservé aux super administrateurs.
        </p>
      </div>
    );
  }

  const visibleRows = rows.filter((r) => matchesQuery(r, query));

  return (
    <>
      <div>
        <h3 className="bo-h1" style={{ marginBottom: 2 }}>
          Connexions
        </h3>
        <div className="bo-sub" style={{ marginBottom: 0 }}>
          Connexions et déconnexions des comptes administrateurs.
        </div>
      </div>

      {error && (
        <p className="err-msg" style={{ marginTop: 10 }}>
          {error}
        </p>
      )}

      <div className="tablewrap" style={{ marginTop: 16 }}>
        <table className="dtable">
          <thead>
            <tr>
              <th>Compte</th>
              <th>Action</th>
              <th>Date</th>
              <th>IP</th>
              <th>Appareil</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="hint">
                  Chargement…
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="hint">
                  Aucune connexion à afficher.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.metadata?.name ?? row.metadata?.email ?? row.actorId}
                    {row.metadata?.name && (
                      <div className="hint" style={{ fontSize: 11 }}>
                        {row.metadata.email}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`pill ${row.action === 'auth.login' ? 'ok' : 'danger'}`}>
                      {actionLabel(row.action)}
                    </span>
                  </td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>{row.ip ?? '—'}</td>
                  <td>{row.userAgent ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cursor && !loading && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      )}
    </>
  );
}
