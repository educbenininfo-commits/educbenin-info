// frontend/src/app/admin/tableau-de-bord/page.tsx
'use client';

// Écran Tableau de bord — docs/design-reference/DESIGN-SPEC.md, section
// "9. Tableau de bord". #kpiBlockGeneral, "en attente" and "activité
// récente" are now real (see Task 24 of
// docs/superpowers/plans/2026-09-03-dossiers-backend.md for why this page
// is a client component rather than the spec's original server-component
// suggestion). #kpiBlockFinance and the chart/payment-breakdown panels stay
// example data per spec §2/§10 — no financial ledger exists yet.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { fetchDossiers } from '@/lib/dossiers-admin-api';
import { FinanceChart } from '@/components/backoffice/FinanceChart';
import { fmtF2 } from '@/lib/format';
import {
  STAGE_NAMES,
  pillClass,
  displayName,
  formatRelativeTime,
  matchesDossierSearch,
  type DossierListItem,
} from '@/lib/dossiers-data';
import { SPECIALTIES } from '@/lib/specialties';
import { TARIFS_HISTORIQUE, ADMIN_MEMBERS } from '@/lib/backoffice-static-data';

interface EnAttenteRow {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
  stage: number;
  stageChangedAt: string;
}
interface ActivityEvent {
  dossierId: string;
  reference: string;
  label: string;
  at: string;
}
interface SummaryResponse {
  kpis: Record<string, number>;
  enAttente: EnAttenteRow[];
  activiteRecente: ActivityEvent[];
}

const KPI_DEFS: { key: string; l: string; cls: string }[] = [
  { key: '1', l: 'En cours de traitement', cls: 'accent' },
  { key: '2', l: 'Authentification du diplôme', cls: 'accent' },
  { key: '3', l: 'Inscription en ligne', cls: 'warn' },
  { key: '4', l: 'Dépôt en cours', cls: 'warn' },
  { key: '5', l: 'Déposés avec succès', cls: 'ok' },
  { key: '0', l: 'Rejetés', cls: 'danger' },
];

const FIN_FACTURE = [1250000, 1400000, 1600000, 1800000, 2100000, 2450000];
const FIN_ENCAISSE = [1100000, 1300000, 1450000, 1600000, 1850000, 2000000];
const totalFacture = FIN_FACTURE.reduce((a, b) => a + b, 0);
const totalEncaisse = FIN_ENCAISSE.reduce((a, b) => a + b, 0);
const reste = totalFacture - totalEncaisse;

const FIN_MOYENS: { label: string; pct: number; color: string }[] = [
  { label: 'Mobile Money', pct: 62, color: '#4F46E5' },
  { label: 'Espèces', pct: 23, color: '#9C6F17' },
  { label: 'Virement', pct: 15, color: '#8B84C7' },
];

export default function TableauDeBordPage() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get('q') ?? '';
  const query = rawQuery.trim().toLowerCase();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api<SummaryResponse>('/api/admin/dossiers/summary');
        if (!cancelled) setSummary(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Global search — the Tableau de bord's search box is the one entry point
  // that searches EVERY back-office section at once (à la recherche
  // Réglages iPhone), unlike every other page which only filters its own
  // list. Dossiers are fetched on demand (only while a query is active);
  // the other sections are already in-memory arrays, filtered client-side.
  const [dossiers, setDossiers] = useState<DossierListItem[]>([]);
  const [rejetes, setRejetes] = useState<DossierListItem[]>([]);
  const [dossiersLoading, setDossiersLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setDossiersLoading(true);
    void (async () => {
      try {
        const [all, rejected] = await Promise.all([fetchDossiers('all'), fetchDossiers(0)]);
        if (!cancelled) {
          setDossiers(all.items);
          setRejetes(rejected.items);
        }
      } finally {
        if (!cancelled) setDossiersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (query) {
    const matchingDossiers = dossiers.filter((d) => matchesDossierSearch(d, query));
    const matchingRejetes = rejetes.filter((d) => matchesDossierSearch(d, query));
    const matchingSpecialites = SPECIALTIES.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.salle.toLowerCase().includes(query) ||
        s.date.includes(query),
    );
    const matchingTarifs = TARIFS_HISTORIQUE.filter(
      (h) =>
        h.depuis.includes(query) ||
        h.prix.toLowerCase().includes(query) ||
        h.regle.toLowerCase().includes(query) ||
        h.statut.toLowerCase().includes(query),
    );
    const matchingMembers = ADMIN_MEMBERS.filter((m) => m.name.toLowerCase().includes(query));

    const qs = `?q=${encodeURIComponent(rawQuery)}`;
    const nothingFound =
      !dossiersLoading &&
      matchingDossiers.length === 0 &&
      matchingRejetes.length === 0 &&
      matchingSpecialites.length === 0 &&
      matchingTarifs.length === 0 &&
      matchingMembers.length === 0;

    return (
      <>
        <h3 className="bo-h1">Résultats pour «&nbsp;{rawQuery}&nbsp;»</h3>
        <div className="bo-sub">Recherche dans tout le back-office.</div>

        {dossiersLoading && (
          <p className="hint" style={{ marginTop: 16 }}>
            Recherche en cours…
          </p>
        )}
        {nothingFound && (
          <p className="hint" style={{ marginTop: 16 }}>
            Aucun résultat dans Dossiers, Dossiers rejetés, Spécialités, Tarifs ou Comptes admin.
          </p>
        )}

        {matchingDossiers.length > 0 && (
          <div className="panel" style={{ marginTop: 18 }}>
            <h3>Dossiers ({matchingDossiers.length})</h3>
            {matchingDossiers.map((d) => (
              <Link
                key={d.id}
                href={`/admin/dossiers${qs}`}
                className="alert-row"
                style={{ display: 'flex' }}
              >
                <span>
                  {d.reference} · {displayName(d.nom, d.prenom)}
                </span>
                <span className={`pill ${pillClass(d.stage)}`}>{STAGE_NAMES[d.stage]}</span>
              </Link>
            ))}
          </div>
        )}

        {matchingRejetes.length > 0 && (
          <div className="panel" style={{ marginTop: 18 }}>
            <h3>Dossiers rejetés ({matchingRejetes.length})</h3>
            {matchingRejetes.map((d) => (
              <Link
                key={d.id}
                href={`/admin/dossiers-rejetes${qs}`}
                className="alert-row"
                style={{ display: 'flex' }}
              >
                <span>
                  {d.reference} · {displayName(d.nom, d.prenom)}
                </span>
                <span className="pill danger">{d.motifRejet || 'Rejeté'}</span>
              </Link>
            ))}
          </div>
        )}

        {matchingSpecialites.length > 0 && (
          <div className="panel" style={{ marginTop: 18 }}>
            <h3>Spécialités &amp; WhatsApp ({matchingSpecialites.length})</h3>
            {matchingSpecialites.map((s) => (
              <Link
                key={s.code}
                href={`/admin/specialites${qs}`}
                className="alert-row"
                style={{ display: 'flex' }}
              >
                <span>{s.name}</span>
                <span className="pill neutral">{s.salle}</span>
              </Link>
            ))}
          </div>
        )}

        {matchingTarifs.length > 0 && (
          <div className="panel" style={{ marginTop: 18 }}>
            <h3>Tarifs ({matchingTarifs.length})</h3>
            {matchingTarifs.map((h) => (
              <Link
                key={h.depuis}
                href={`/admin/tarifs${qs}`}
                className="alert-row"
                style={{ display: 'flex' }}
              >
                <span>
                  {h.prix} — en vigueur depuis {h.depuis}
                </span>
                <span className={`pill ${h.statut === 'Actif' ? 'ok' : 'neutral'}`}>
                  {h.statut}
                </span>
              </Link>
            ))}
          </div>
        )}

        {matchingMembers.length > 0 && (
          <div className="panel" style={{ marginTop: 18 }}>
            <h3>Comptes admin &amp; rôles ({matchingMembers.length})</h3>
            {matchingMembers.map((m) => (
              <Link
                key={m.name}
                href={`/admin/comptes-admin${qs}`}
                className="alert-row"
                style={{ display: 'flex' }}
              >
                <span>{m.name}</span>
              </Link>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <h3 className="bo-h1">Tableau de bord</h3>

      <div className="dash-kpis">
        <div id="kpiBlockGeneral">
          <div className="bo-sub">Vue d&rsquo;ensemble de tous les dossiers</div>
          <div className="kpi-grid">
            {KPI_DEFS.map((k) => (
              <div key={k.key} className={`kpi ${k.cls}`}>
                <div className="n mono">{loading ? '—' : (summary?.kpis[k.key] ?? 0)}</div>
                <div className="l">{k.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div id="kpiBlockFinance">
          <div className="section-lbl" style={{ marginTop: 0 }}>
            Suivi financier — interne, non visible du candidat
          </div>
          <div className="kpi-grid fin-kpi">
            <div className="kpi accent">
              <div className="n mono" style={{ fontSize: 18 }}>
                {fmtF2(totalFacture)}
              </div>
              <div className="l">Total facturé (6 mois)</div>
            </div>
            <div className="kpi ok">
              <div className="n mono" style={{ fontSize: 18 }}>
                {fmtF2(totalEncaisse)}
              </div>
              <div className="l">Total encaissé</div>
            </div>
            <div className="kpi warn">
              <div className="n mono" style={{ fontSize: 18 }}>
                {fmtF2(reste)}
              </div>
              <div className="l">Reste à payer (dossiers ouverts)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 22 }}>
        <div className="panel">
          <h3>Dossiers en attente depuis plus de 5 jours</h3>
          <div className="sub">Nécessitent une action de l&rsquo;équipe</div>
          {(() => {
            if (loading) return <p className="hint">Chargement…</p>;
            const rows = summary!.enAttente;
            if (rows.length === 0) {
              return <p className="hint">Aucun dossier en attente depuis plus de 5 jours.</p>;
            }
            return rows.map((d) => (
              <div key={d.id} className="alert-row">
                <span>
                  {d.reference} · {displayName(d.nom, d.prenom)}
                </span>
                <span className={`pill ${pillClass(d.stage)}`}>{STAGE_NAMES[d.stage]}</span>
              </div>
            ));
          })()}
        </div>
        <div className="panel">
          <h3>Activité récente</h3>
          <div className="sub">Dernières actions du back-office</div>
          {(() => {
            if (loading) return <p className="hint">Chargement…</p>;
            const rows = summary!.activiteRecente;
            if (rows.length === 0) {
              return <p className="hint">Aucune activité récente.</p>;
            }
            return rows.map((a, i) => (
              <div key={`${a.dossierId}-${i}`} className="alert-row">
                <span>{a.label}</span>
                <span className="pill neutral">{formatRelativeTime(a.at)}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 22 }}>
        <div className="panel">
          <h3>Évolution des encaissements</h3>
          <div className="sub">Facturé vs. encaissé, 6 derniers mois — survolez pour le détail</div>
          <FinanceChart />
        </div>
        <div className="panel">
          <h3>Répartition par moyen de paiement</h3>
          <div className="sub">Part de l&rsquo;encaissé, 6 derniers mois</div>
          <div>
            {FIN_MOYENS.map((m) => (
              <div key={m.label} className="paybar-row">
                <div className="paybar-top">
                  <span className="lbl">
                    <span className="sw" style={{ background: m.color }} />
                    {m.label}
                  </span>
                  <span className="val">{m.pct}%</span>
                </div>
                <div className="paybar-track">
                  <div
                    className="paybar-fill"
                    style={{ width: `${m.pct}%`, background: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
