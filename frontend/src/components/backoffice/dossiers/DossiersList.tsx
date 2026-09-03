'use client';

import { useState } from 'react';
import {
  DOSSIER_FILTERS,
  INITIAL_DOSSIERS,
  STAGE_NAMES,
  initials,
  pillClass,
  type Dossier,
} from '@/lib/dossiers-data';
import { DossierModal } from './DossierModal';

export function DossiersList() {
  const [dossiers, setDossiers] = useState<Record<string, Dossier>>(INITIAL_DOSSIERS);
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const ids = Object.keys(dossiers).filter((id) =>
    filter === 'all' ? dossiers[id]!.stage >= 1 : dossiers[id]!.stage === filter,
  );

  function countFor(stage: 'all' | 1 | 2 | 3 | 4 | 5): number {
    return Object.values(dossiers).filter((d) =>
      stage === 'all' ? d.stage >= 1 : d.stage === stage,
    ).length;
  }

  function updateDossier(id: string, next: Dossier) {
    setDossiers((prev) => ({ ...prev, [id]: next }));
  }

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
            <span className="cnt">{countFor(f.stage)}</span>
          </button>
        ))}
      </div>

      <div className="dossier-list">
        {ids.length === 0 ? (
          <div className="dossier-empty">Aucun dossier dans cette étape pour le moment.</div>
        ) : (
          ids.map((id) => {
            const d = dossiers[id]!;
            return (
              <div key={id} className="d-row" onClick={() => setOpenId(id)}>
                <div className="top">
                  <div className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                    {initials(d.name)}
                  </div>
                  <div>
                    <div className="name">{d.name}</div>
                    <div className="spec">
                      {d.spec} · {d.ref}
                    </div>
                  </div>
                </div>
                <div className="meta">
                  <span className={`pill ${pillClass(d.stage)}`}>{STAGE_NAMES[d.stage]}</span>
                  <span className="days">{d.days}</span>
                  <span className="chev">›</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {openId && dossiers[openId] && (
        <DossierModal
          key={dossiers[openId]!.ref}
          dossier={dossiers[openId]!}
          onClose={() => setOpenId(null)}
          onUpdate={(next) => updateDossier(openId, next)}
        />
      )}
    </>
  );
}
