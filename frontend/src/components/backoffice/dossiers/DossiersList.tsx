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
import { ecoleBadgeClass } from '@/lib/ecole-display';
import { ListGridToggle, type ViewMode } from '@/components/backoffice/ListGridToggle';
import { DossierModal } from './DossierModal';

interface DossiersResponse {
  items: DossierListItem[];
  counts: Record<string, number>;
  ecoles: { id: string; nom: string }[];
  ecoleCounts: Record<string, number>;
}

function subLabel(d: DossierListItem): string {
  return d.specialtyCodes.length > 0 ? specialtyLabel(d.specialtyCodes) : d.categorieLabel;
}

export function DossiersList() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [ecoleId, setEcoleId] = useState('all');
  const [view, setView] = useState<ViewMode>('list');
  const [openId, setOpenId] = useState<string | null>(null);

  // useApi caches per URL (module-level, survives unmount) — switching
  // filters or navigating back to Dossiers from elsewhere in the back-office
  // shows the last-known list instantly instead of a blank "Chargement…"
  // every time, while a stale (>2min) entry silently revalidates in the
  // background.
  const { data, loading, refresh } = useApi<DossiersResponse>(
    `/api/admin/dossiers?stage=${filter}&ecoleId=${encodeURIComponent(ecoleId)}`,
  );
  const items = data?.items ?? [];
  const counts = data?.counts ?? { all: 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  const ecoles = data?.ecoles ?? [];
  const ecoleCounts = data?.ecoleCounts ?? { all: 0 };

  // Clears the "Dossiers" nav badge — the admin is looking at the list now.
  useEffect(() => {
    markDossiersNotificationsRead();
  }, []);

  const visibleItems = items.filter((d) => matchesDossierSearch(d, query));

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div>
          <div className="dossier-filters">
            <button
              type="button"
              className={`df-chip${ecoleId === 'all' ? ' on' : ''}`}
              onClick={() => setEcoleId('all')}
            >
              Toutes les écoles
              <span className="cnt">{ecoleCounts.all ?? 0}</span>
            </button>
            {ecoles.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`df-chip${ecoleId === e.id ? ' on' : ''}`}
                onClick={() => setEcoleId(e.id)}
              >
                {e.nom}
                <span className="cnt">{ecoleCounts[e.id] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="dossier-filters" style={{ marginTop: 4 }}>
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
        </div>

        <ListGridToggle mode={view} onChange={setView} />
      </div>

      {loading && !data ? (
        <div className="dossier-empty">Chargement…</div>
      ) : visibleItems.length === 0 ? (
        <div className="dossier-empty">
          {query
            ? 'Aucun dossier ne correspond à cette recherche.'
            : 'Aucun dossier dans cette étape pour le moment.'}
        </div>
      ) : view === 'list' ? (
        <div className="dossier-list">
          {visibleItems.map((d) => (
            <div key={d.id} className="d-row" onClick={() => setOpenId(d.id)}>
              <div className="top">
                <div className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                  {initials(displayName(d.nom, d.prenom))}
                </div>
                <div>
                  <div className="name">{displayName(d.nom, d.prenom)}</div>
                  <div className="spec">
                    {subLabel(d)} · {d.reference}
                  </div>
                </div>
              </div>
              <div className="meta">
                {d.correctionRequestedAt && (
                  <span
                    className="pill"
                    style={{ background: 'var(--prod-warning-tint)', color: 'var(--prod-warning)' }}
                    title="Une correction a été demandée au candidat — en attente de sa mise à jour."
                  >
                    Dossier MAJ
                  </span>
                )}
                <span className={`badge-ecole ${ecoleBadgeClass(d.ecoleNom)}`}>
                  {d.ecoleNom} · {d.categorieLabel}
                </span>
                <span className={`pill ${pillClass(d.stage)}`}>{STAGE_NAMES[d.stage]}</span>
                <span className="days">{formatElapsed(d.stage, d.stageChangedAt)}</span>
                <span className="chev">›</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bo-grid">
          {visibleItems.map((d) => (
            <div key={d.id} className="bo-card" onClick={() => setOpenId(d.id)}>
              <div className="bo-card-title">{displayName(d.nom, d.prenom)}</div>
              <div className="bo-card-row">
                <span>{subLabel(d)}</span>
                <span className="mono">{d.reference}</span>
              </div>
              <div className="bo-card-badges">
                <span className={`badge-ecole ${ecoleBadgeClass(d.ecoleNom)}`}>
                  {d.ecoleNom} · {d.categorieLabel}
                </span>
                <span className={`pill ${pillClass(d.stage)}`}>{STAGE_NAMES[d.stage]}</span>
                {d.correctionRequestedAt && (
                  <span
                    className="pill"
                    style={{ background: 'var(--prod-warning-tint)', color: 'var(--prod-warning)' }}
                  >
                    Dossier MAJ
                  </span>
                )}
              </div>
              <div className="bo-card-row">
                <span>{formatElapsed(d.stage, d.stageChangedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
