// frontend/src/components/backoffice/dossiers/RejectedDossiersList.tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApi, invalidateCache } from '@/lib/useApi';
import {
  displayName,
  specialtyLabel,
  matchesDossierSearch,
  type DossierListItem,
} from '@/lib/dossiers-data';
import { restoreDossier } from '@/lib/dossiers-admin-api';

interface DossiersResponse {
  items: DossierListItem[];
  counts: Record<string, number>;
}

export function RejectedDossiersList() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refresh } = useApi<DossiersResponse>('/api/admin/dossiers?stage=0');
  const items = data?.items ?? [];

  async function handleRestore(id: string) {
    setError(null);
    setRestoringId(id);
    try {
      await restoreDossier(id);
      // Restoring moves the dossier out of stage 0 and into the normal
      // Dossiers list (stage=all) — that cache entry is now stale too.
      invalidateCache('/api/admin/dossiers?stage=all');
      await refresh();
    } catch {
      setError('Impossible de restaurer ce dossier.');
    } finally {
      setRestoringId(null);
    }
  }

  const visibleItems = items.filter((d) => matchesDossierSearch(d, query));

  return (
    <div className="tablewrap">
      {error && (
        <p className="err-msg" style={{ marginBottom: 10 }}>
          {error}
        </p>
      )}
      <table className="dtable">
        <thead>
          <tr>
            <th>Dossier</th>
            <th>Spécialité</th>
            <th>Motif</th>
            <th>Rejeté le</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && !data ? (
            <tr>
              <td colSpan={5} className="hint">
                Chargement…
              </td>
            </tr>
          ) : visibleItems.length === 0 ? (
            <tr>
              <td colSpan={5} className="hint">
                {query
                  ? 'Aucun dossier rejeté ne correspond à cette recherche.'
                  : 'Aucun dossier rejeté pour le moment.'}
              </td>
            </tr>
          ) : (
            visibleItems.map((d) => (
              <tr key={d.id}>
                <td>
                  {displayName(d.nom, d.prenom)} · {d.reference}
                </td>
                <td>{specialtyLabel(d.specialtyCodes)}</td>
                <td className="rej-reason">{d.motifRejet || '—'}</td>
                <td className="mono">{new Date(d.stageChangedAt).toLocaleDateString('fr-FR')}</td>
                <td>
                  <button
                    type="button"
                    className={`btn btn-outline btn-sm${restoringId === d.id ? ' is-disabled' : ''}`}
                    disabled={restoringId === d.id}
                    onClick={() => void handleRestore(d.id)}
                  >
                    {restoringId === d.id ? 'Restauration…' : 'Restaurer'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
