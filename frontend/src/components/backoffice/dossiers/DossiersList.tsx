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
import { Clock, FileCheck2, FileSearch, FolderOpen, Hourglass, PenLine } from 'lucide-react';
import { StatCard } from '@/components/backoffice/StatCard';
import { DateRangeFilter } from '@/components/backoffice/DateRangeFilter';
import { DATE_RANGE_LABELS, inDateRange, type DateRangePreset } from '@/lib/date-range';

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
  const [period, setPeriod] = useState<DateRangePreset>('all');
  const [view, setView] = useState<ViewMode>('list');
  const [openId, setOpenId] = useState<string | null>(null);

  // One request for every open dossier (stages 1-5, all schools); the
  // période, école and étape filters — and every counter/KPI — are then
  // computed client-side from the same set, so they always agree with each
  // other. useApi caches per URL, so coming back to this screen is instant.
  const { data, loading, refresh } = useApi<DossiersResponse>(
    '/api/admin/dossiers?stage=all&ecoleId=all',
  );
  const ecoles = data?.ecoles ?? [];

  // Clears the "Dossiers" nav badge — the admin is looking at the list now.
  useEffect(() => {
    markDossiersNotificationsRead();
  }, []);

  const inPeriod = (data?.items ?? []).filter((d) => inDateRange(d.createdAt, period));
  const inEcole = inPeriod.filter((d) => ecoleId === 'all' || d.ecoleId === ecoleId);
  const visibleItems = inEcole.filter(
    (d) => (filter === 'all' || d.stage === filter) && matchesDossierSearch(d, query),
  );

  const counts: Record<string, number> = { all: inEcole.length };
  for (const d of inEcole) counts[String(d.stage)] = (counts[String(d.stage)] ?? 0) + 1;
  const ecoleCounts: Record<string, number> = { all: inPeriod.length };
  for (const d of inPeriod) ecoleCounts[d.ecoleId] = (ecoleCounts[d.ecoleId] ?? 0) + 1;

  const fiveDaysAgo = Date.now() - 5 * 24 * 3600 * 1000;
  const kpi = {
    total: inEcole.length,
    traitement: inEcole.filter((d) => d.stage === 1 || d.stage === 2).length,
    inscription: inEcole.filter((d) => d.stage === 3 || d.stage === 4).length,
    deposes: inEcole.filter((d) => d.stage === 5).length,
    corrections: inEcole.filter((d) => d.correctionRequestedAt).length,
    bloques: inEcole.filter(
      (d) => d.stage < 5 && new Date(d.stageChangedAt).getTime() < fiveDaysAgo,
    ).length,
  };
  const dash = loading && !data;
  const v = (n: number) => (dash ? '—' : n);

  return (
    <>
      <div className="bo-page-head">
        <div>
          <h3 className="bo-h1">Dossiers</h3>
          <div className="bo-sub">
            Filtrez par période, école et étape, puis cliquez sur un dossier pour l&rsquo;ouvrir.
          </div>
        </div>
        <div className="bo-head-actions">
          <DateRangeFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="stat-grid kpi-3">
        <StatCard
          label="Dossiers"
          value={v(kpi.total)}
          icon={FolderOpen}
          caption={DATE_RANGE_LABELS[period]}
          featured
        />
        <StatCard
          label="En traitement"
          value={v(kpi.traitement)}
          icon={FileSearch}
          chip="violet"
          caption="Vérification & authentification"
        />
        <StatCard
          label="Inscription & dépôt"
          value={v(kpi.inscription)}
          icon={Hourglass}
          chip="gold"
          caption="Inscription en ligne, dépôt en cours"
        />
        <StatCard
          label="Déposés avec succès"
          value={v(kpi.deposes)}
          icon={FileCheck2}
          chip="success"
          caption="Preuve de dépôt disponible"
        />
        <StatCard
          label="Corrections demandées"
          value={v(kpi.corrections)}
          icon={PenLine}
          chip="warning"
          caption="En attente de mise à jour du candidat"
        />
        <StatCard
          label="Sans mouvement +5 j"
          value={v(kpi.bloques)}
          icon={Clock}
          chip="danger"
          caption="Même étape depuis plus de 5 jours"
        />
      </div>

      <div className="list-toolbar">
        <div className="dossier-filters" style={{ marginBottom: 0 }}>
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
        <ListGridToggle mode={view} onChange={setView} />
      </div>

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

      {loading && !data ? (
        <div className="dossier-empty">Chargement…</div>
      ) : visibleItems.length === 0 ? (
        <div className="dossier-empty">
          {query
            ? 'Aucun dossier ne correspond à cette recherche.'
            : 'Aucun dossier pour ces filtres.'}
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
