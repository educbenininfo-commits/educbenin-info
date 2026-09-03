// Écran Tableau de bord — docs/design-reference/DESIGN-SPEC.md, section
// "9. Tableau de bord". Layout, copy et données d'exemple reproduits à la
// lettre depuis docs/design-reference/educbenin-prototype.html. Les KPI,
// alertes, activité et séries du graphique restent des exemples statiques
// (aucun modèle de données "dossier" n'existe encore côté backend) — seul
// l'accès à cet écran est réel (voir frontend/src/app/admin/layout.tsx).

import { FinanceChart } from '@/components/backoffice/FinanceChart';
import { fmtF2 } from '@/lib/format';

const KPIS: { n: number; l: string; cls: string }[] = [
  { n: 24, l: 'En cours de traitement', cls: 'accent' },
  { n: 9, l: 'Authentification du diplôme', cls: 'accent' },
  { n: 6, l: 'Inscription en ligne', cls: 'warn' },
  { n: 4, l: 'Dépôt en cours', cls: 'warn' },
  { n: 58, l: 'Déposés avec succès', cls: 'ok' },
  { n: 5, l: 'Rejetés', cls: 'danger' },
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

const ALERTES: { text: string; pill: 'warn' | 'danger'; label: string }[] = [
  { text: 'EB-2026-000401 · Dr. Sossou T.', pill: 'warn', label: 'Authentification' },
  { text: 'EB-2026-000388 · Dr. Houngbo E.', pill: 'warn', label: 'En cours de traitement' },
  { text: 'EB-2026-000377 · Dr. Adjovi R.', pill: 'danger', label: 'Inscription en ligne' },
];

const ACTIVITE: { text: string; time: string }[] = [
  { text: 'Statut modifié', time: 'Il y a 12 min' },
  { text: "Formulaire d'authentification reçu", time: 'Il y a 40 min' },
  { text: 'Nouveau dossier reçu', time: 'Il y a 1 h' },
];

export default function TableauDeBordPage() {
  return (
    <>
      <h3 className="bo-h1">Tableau de bord</h3>

      <div className="dash-kpis">
        <div id="kpiBlockGeneral">
          <div className="bo-sub">Vue d&rsquo;ensemble de tous les dossiers</div>
          <div className="kpi-grid">
            {KPIS.map((k) => (
              <div key={k.l} className={`kpi ${k.cls}`}>
                <div className="n mono">{k.n}</div>
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
          {ALERTES.map((a) => (
            <div key={a.text} className="alert-row">
              <span>{a.text}</span>
              <span className={`pill ${a.pill}`}>{a.label}</span>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Activité récente</h3>
          <div className="sub">Dernières actions du back-office</div>
          {ACTIVITE.map((a) => (
            <div key={a.text} className="alert-row">
              <span>{a.text}</span>
              <span className="pill neutral">{a.time}</span>
            </div>
          ))}
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
