// frontend/src/components/backoffice/dossiers/RejectedDossiersList.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  displayName,
  specialtyLabel,
  matchesDossierSearch,
  type DossierListItem,
} from '@/lib/dossiers-data';
import { fetchDossiers, restoreDossier } from '@/lib/dossiers-admin-api';

export function RejectedDossiersList() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [items, setItems] = useState<DossierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetchDossiers(0);
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleRestore(id: string) {
    setError(null);
    setRestoringId(id);
    try {
      await restoreDossier(id);
      await reload();
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
          {loading ? (
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
