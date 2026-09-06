// frontend/src/components/backoffice/dossiers/DossiersList.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DOSSIER_FILTERS,
  STAGE_NAMES,
  initials,
  pillClass,
  displayName,
  specialtyLabel,
  formatElapsed,
  matchesDossierSearch,
  type DossierListItem,
} from '@/lib/dossiers-data';
import { fetchDossiers } from '@/lib/dossiers-admin-api';
import { DossierModal } from './DossierModal';

export function DossiersList() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [items, setItems] = useState<DossierListItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  });
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetchDossiers(filter);
      setItems(res.items);
      setCounts(res.counts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // Only `filter` should re-trigger the fetch — `reload` is redefined every
    // render but is stable in behavior (closes over the same `filter` value).
    // (No react-hooks/exhaustive-deps plugin is configured in this repo's
    // eslint.config.mjs, so no disable directive is needed here.)
  }, [filter]);

  const visibleItems = items.filter((d) => matchesDossierSearch(d, query));

  return (
    <>
      <div className="dossier-filters">
        {DOSSIER_FILTERS.map((f) => (
          <button
            key={f.stage}
            type="button"
            className={`df-chip${filter === f.stage ? ' on' : ''}`}
            onClick={() => setFilter(f.stage)}
          >
            {f.label}
            <span className="cnt">{counts[String(f.stage)] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="dossier-list">
        {loading ? (
          <div className="dossier-empty">Chargement…</div>
        ) : visibleItems.length === 0 ? (
          <div className="dossier-empty">
            {query
              ? 'Aucun dossier ne correspond à cette recherche.'
              : 'Aucun dossier dans cette étape pour le moment.'}
          </div>
        ) : (
          visibleItems.map((d) => (
            <div key={d.id} className="d-row" onClick={() => setOpenId(d.id)}>
              <div className="top">
                <div className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                  {initials(displayName(d.nom, d.prenom))}
                </div>
                <div>
                  <div className="name">{displayName(d.nom, d.prenom)}</div>
                  <div className="spec">
                    {specialtyLabel(d.specialtyCodes)} · {d.reference}
                  </div>
                </div>
              </div>
              <div className="meta">
                <span className={`pill ${pillClass(d.stage)}`}>{STAGE_NAMES[d.stage]}</span>
                <span className="days">{formatElapsed(d.stage, d.stageChangedAt)}</span>
                <span className="chev">›</span>
              </div>
            </div>
          ))
        )}
      </div>

      {openId && (
        <DossierModal
          key={openId}
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => void reload()}
        />
      )}
    </>
  );
}
