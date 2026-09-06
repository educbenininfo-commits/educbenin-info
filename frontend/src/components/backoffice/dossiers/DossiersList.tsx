// frontend/src/components/backoffice/dossiers/DossiersList.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApi } from '@/lib/useApi';
import { markDossiersNotificationsRead } from '@/lib/useDossiersUnreadCount';
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
import { DossierModal } from './DossierModal';

interface DossiersResponse {
  items: DossierListItem[];
  counts: Record<string, number>;
}

export function DossiersList() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  // useApi caches per URL (module-level, survives unmount) — switching
  // filters or navigating back to Dossiers from elsewhere in the back-office
  // shows the last-known list instantly instead of a blank "Chargement…"
  // every time, while a stale (>2min) entry silently revalidates in the
  // background.
  const { data, loading, refresh } = useApi<DossiersResponse>(
    `/api/admin/dossiers?stage=${filter}`,
  );
  const items = data?.items ?? [];
  const counts = data?.counts ?? { all: 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  // Clears the "Dossiers" nav badge — the admin is looking at the list now.
  useEffect(() => {
    markDossiersNotificationsRead();
  }, []);

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
        {loading && !data ? (
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
          onChanged={() => void refresh()}
        />
      )}
    </>
  );
}
