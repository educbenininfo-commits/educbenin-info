'use client';

// Écran back-office "Statistiques" — fréquentation du site public à partir
// des pages vues first-party (POST /api/track) : visiteurs en direct
// (rafraîchis toutes les 20 s), cadrans de synthèse, courbe par minute /
// heure / jour / semaine / mois / année, provenance, pays, pages et appareils.
import { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Eye,
  FileText,
  Globe2,
  MonitorSmartphone,
  Radio,
  Share2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { useLiveVisitors } from '@/lib/useLiveVisitors';
import { StatCard } from '@/components/backoffice/StatCard';
import { TrendChart, type TrendSeries } from '@/components/backoffice/TrendChart';
import {
  DEVICE_LABELS,
  GRANULARITIES,
  GRANULARITY_CONFIG,
  bucketLabel,
  countryLabel,
  type AnalyticsBreakdownRow,
  type AnalyticsResponse,
  type Device,
  type Granularity,
} from '@/lib/analytics';

type Indicator = 'views' | 'visits' | 'visitors';

const INDICATORS: Array<{ key: Indicator; label: string }> = [
  { key: 'views', label: 'Pages vues' },
  { key: 'visits', label: 'Visites' },
  { key: 'visitors', label: 'Visiteurs' },
];

function Breakdown({
  title,
  sub,
  icon: Icon,
  chip,
  rows,
  format,
  loading,
}: {
  title: string;
  sub: string;
  icon: LucideIcon;
  chip: string;
  rows: AnalyticsBreakdownRow[] | undefined;
  format: (key: string) => string;
  loading: boolean;
}) {
  const total = (rows ?? []).reduce((s, r) => s + r.count, 0);
  return (
    <div className="panel">
      <h3>
        <span className={`icon-chip ${chip}`}>
          <Icon />
        </span>
        {title}
      </h3>
      <div className="sub">{sub}</div>
      {loading && !rows ? (
        <p className="hint">Chargement…</p>
      ) : !rows || rows.length === 0 ? (
        <div className="empty-state">
          <div className="tile">
            <Icon size={20} />
          </div>
          <strong>Pas encore de données</strong>
          Les visites du site s&rsquo;afficheront ici.
        </div>
      ) : (
        rows.map((r) => {
          const pct = total ? Math.round((r.count / total) * 100) : 0;
          return (
            <div key={r.key} className="paybar-row">
              <div className="paybar-top">
                <span className="lbl">{format(r.key)}</span>
                <span className="val">
                  {r.count.toLocaleString('fr-FR')} · {pct}%
                </span>
              </div>
              <div className="paybar-track">
                <div className="paybar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function StatistiquesScreen() {
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [indicator, setIndicator] = useState<Indicator>('visitors');
  const { data, loading } = useApi<AnalyticsResponse>(
    `/api/admin/analytics?granularity=${granularity}`,
  );
  const live = useLiveVisitors();

  const labels = useMemo(
    () => (data?.buckets ?? []).map((b) => bucketLabel(b.key, granularity)),
    [data, granularity],
  );
  const series = useMemo<TrendSeries[]>(
    () => [
      {
        label: INDICATORS.find((i) => i.key === indicator)!.label,
        data: (data?.buckets ?? []).map((b) => b[indicator]),
      },
    ],
    [data, indicator],
  );

  const dash = loading && !data;
  const fmt = (n: number | undefined) => (dash || n == null ? '—' : n.toLocaleString('fr-FR'));
  const pagesPerVisit =
    data && data.totals.visits > 0 ? (data.totals.views / data.totals.visits).toFixed(1) : '—';
  const liveCount = live?.live ?? data?.live;

  return (
    <>
      <div className="bo-page-head">
        <div>
          <h3 className="bo-h1">Statistiques</h3>
          <div className="bo-sub">Fréquentation du site public, en direct et dans le temps.</div>
        </div>
        <div className="bo-head-actions">
          <label className="date-pill">
            <CalendarDays size={16} aria-hidden="true" />
            <span className="sr-only">Granularité</span>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
            >
              {GRANULARITIES.map((g) => (
                <option key={g} value={g}>
                  {GRANULARITY_CONFIG[g].label}
                </option>
              ))}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          label="En direct"
          value={
            <span className="live-val">
              <span className="live-dot" aria-hidden="true" />
              {liveCount == null ? '—' : liveCount.toLocaleString('fr-FR')}
            </span>
          }
          icon={Radio}
          caption="Visiteurs actifs ces 5 dernières minutes"
          featured
        />
        <StatCard
          label="Visiteurs"
          value={fmt(data?.totals.visitors)}
          icon={Users}
          chip="violet"
          caption={GRANULARITY_CONFIG[granularity].label}
        />
        <StatCard
          label="Visites"
          value={fmt(data?.totals.visits)}
          icon={BarChart3}
          chip="success"
          caption="Sessions de navigation"
        />
        <StatCard
          label="Pages vues"
          value={fmt(data?.totals.views)}
          icon={Eye}
          chip="gold"
          caption={
            pagesPerVisit === '—' ? 'Pages consultées' : `${pagesPerVisit} page(s) par visite`
          }
        />
      </div>

      <div className="panel" style={{ marginTop: 22 }}>
        <div className="chart-head">
          <h3>
            <span className="chart-dot" aria-hidden="true" />
            Évolution — {INDICATORS.find((i) => i.key === indicator)!.label.toLowerCase()}
          </h3>
          <span className="chart-help">Choisissez un indicateur pour voir son évolution</span>
        </div>
        <div className="dossier-filters" style={{ marginBottom: 14 }}>
          {INDICATORS.map((i) => (
            <button
              key={i.key}
              type="button"
              className={`df-chip${indicator === i.key ? ' on' : ''}`}
              onClick={() => setIndicator(i.key)}
            >
              {i.label}
            </button>
          ))}
        </div>
        {dash ? (
          <p className="hint">Chargement…</p>
        ) : (
          <TrendChart
            labels={labels}
            series={series}
            height={260}
            ariaLabel={`Évolution des ${series[0]!.label.toLowerCase()}`}
          />
        )}
      </div>

      {live && live.pages.length > 0 && (
        <div className="panel" style={{ marginTop: 22 }}>
          <h3>
            <span className="icon-chip danger">
              <Radio />
            </span>
            Pages consultées en ce moment
          </h3>
          <div className="sub">Visiteurs actifs par page, 5 dernières minutes</div>
          {live.pages.map((p) => (
            <div key={p.key} className="alert-row">
              <span>{p.key}</span>
              <span className="pill">{p.count} visiteur(s)</span>
            </div>
          ))}
        </div>
      )}

      <div className="two-col" style={{ marginTop: 22 }}>
        <Breakdown
          title="Provenance"
          sub="D'où viennent les visites (moteurs, réseaux sociaux, accès direct)"
          icon={Share2}
          chip=""
          rows={data?.sources}
          format={(k) => k}
          loading={loading}
        />
        <Breakdown
          title="Pays"
          sub="Visites par pays"
          icon={Globe2}
          chip="success"
          rows={data?.countries}
          format={(k) => countryLabel(k || null)}
          loading={loading}
        />
      </div>
      <div className="two-col" style={{ marginTop: 22 }}>
        <Breakdown
          title="Pages les plus vues"
          sub="Nombre de pages vues"
          icon={FileText}
          chip="gold"
          rows={data?.pages}
          format={(k) => k}
          loading={loading}
        />
        <Breakdown
          title="Appareils"
          sub="Visites par type d'appareil"
          icon={MonitorSmartphone}
          chip="violet"
          rows={data?.devices}
          format={(k) => DEVICE_LABELS[k as Device] ?? k}
          loading={loading}
        />
      </div>
    </>
  );
}
