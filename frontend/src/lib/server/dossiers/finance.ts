// Tableau de bord — "Suivi financier" figures, computed from the payment
// fields staff fill on each dossier (montant, montantSupplement, paye,
// moyen). Definitions (DESIGN-SPEC only gives example values, so these are
// the agreed reading of its labels):
//   - Total facturé (6 mois): montant + supplément of the non-rejected
//     dossiers created in the current month and the 5 before it.
//   - Total encaissé: `paye` of those same dossiers.
//   - Reste à payer (dossiers ouverts): what is still owed on every dossier
//     in stages 1–4, whatever its creation date.
//   - Monthly series and payment-method split use the same 6-month window.
// Months are cut in Bénin time (UTC+1, no daylight saving).

export const FINANCE_MONTHS = 6;
const BENIN_OFFSET_MS = 60 * 60 * 1000;
const MONTH_LABELS = [
  'Janv',
  'Févr',
  'Mars',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sept',
  'Oct',
  'Nov',
  'Déc',
];
export const PAYMENT_METHODS = ['Mobile Money', 'Espèces', 'Virement', 'Non renseigné'] as const;

export interface FinanceDossierRow {
  stage: number;
  montant: number;
  montantSupplement: number | null;
  paye: number;
  moyen: string;
  createdAt: Date;
}

export interface FinanceSummary {
  totalFacture: number;
  totalEncaisse: number;
  reste: number;
  months: { label: string; facture: number; encaisse: number }[];
  moyens: { label: string; montant: number; pct: number }[];
}

function beninYearMonth(d: Date): { y: number; m: number } {
  const local = new Date(d.getTime() + BENIN_OFFSET_MS);
  return { y: local.getUTCFullYear(), m: local.getUTCMonth() };
}

/** UTC instant at which the 6-month window starts (1st of the oldest month, Bénin time). */
export function financeWindowStart(now: Date): Date {
  const { y, m } = beninYearMonth(now);
  return new Date(Date.UTC(y, m - (FINANCE_MONTHS - 1), 1) - BENIN_OFFSET_MS);
}

const total = (d: FinanceDossierRow) => d.montant + (d.montantSupplement ?? 0);

/**
 * `windowRows`: dossiers created since financeWindowStart(now).
 * `openRows`: dossiers in stages 1–4 (any creation date).
 */
export function computeFinance(
  windowRows: FinanceDossierRow[],
  openRows: FinanceDossierRow[],
  now: Date,
): FinanceSummary {
  const { y, m } = beninYearMonth(now);
  const months = Array.from({ length: FINANCE_MONTHS }, (_, i) => {
    const idx = m - (FINANCE_MONTHS - 1) + i;
    const date = new Date(Date.UTC(y, idx, 1));
    return {
      key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
      label: MONTH_LABELS[date.getUTCMonth()] ?? '',
      facture: 0,
      encaisse: 0,
    };
  });
  const byKey = new Map(months.map((mo) => [mo.key, mo]));
  const byMoyen = new Map<string, number>();

  for (const d of windowRows) {
    if (d.stage === 0) continue;
    const ym = beninYearMonth(d.createdAt);
    const month = byKey.get(`${ym.y}-${ym.m}`);
    if (!month) continue;
    month.facture += total(d);
    month.encaisse += d.paye;
    if (d.paye > 0) byMoyen.set(d.moyen, (byMoyen.get(d.moyen) ?? 0) + d.paye);
  }

  const totalFacture = months.reduce((s, mo) => s + mo.facture, 0);
  const totalEncaisse = months.reduce((s, mo) => s + mo.encaisse, 0);
  const reste = openRows
    .filter((d) => d.stage >= 1 && d.stage <= 4)
    .reduce((s, d) => s + Math.max(0, total(d) - d.paye), 0);

  const moyens = PAYMENT_METHODS.map((label) => {
    const montant = byMoyen.get(label) ?? 0;
    return {
      label,
      montant,
      pct: totalEncaisse > 0 ? Math.round((montant / totalEncaisse) * 100) : 0,
    };
  }).filter((x) => x.label !== 'Non renseigné' || x.montant > 0);

  return {
    totalFacture,
    totalEncaisse,
    reste,
    months: months.map(({ label, facture, encaisse }) => ({ label, facture, encaisse })),
    moyens,
  };
}
