import { describe, expect, it } from 'vitest';
import { computeFinance, financeWindowStart, type FinanceDossierRow } from './finance';

const NOW = new Date('2026-10-19T10:00:00Z');

function row(over: Partial<FinanceDossierRow>): FinanceDossierRow {
  return {
    stage: 1,
    montant: 50000,
    montantSupplement: null,
    paye: 0,
    moyen: 'Non renseigné',
    createdAt: new Date('2026-10-10T10:00:00Z'),
    ...over,
  };
}

describe('computeFinance', () => {
  it('returns zeros and six month labels when there is no dossier', () => {
    const f = computeFinance([], [], NOW);
    expect(f.totalFacture).toBe(0);
    expect(f.totalEncaisse).toBe(0);
    expect(f.reste).toBe(0);
    expect(f.months.map((m) => m.label)).toEqual(['Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct']);
    expect(f.moyens.map((m) => m.pct)).toEqual([0, 0, 0]);
  });

  it('sums billed and collected amounts per month, skipping rejected dossiers', () => {
    const rows = [
      row({ montantSupplement: 10000, paye: 60000, moyen: 'Mobile Money' }),
      row({ createdAt: new Date('2026-09-05T10:00:00Z'), paye: 20000, moyen: 'Espèces' }),
      row({ stage: 0, paye: 50000, moyen: 'Virement' }),
    ];
    const f = computeFinance(rows, [], NOW);
    expect(f.totalFacture).toBe(110000);
    expect(f.totalEncaisse).toBe(80000);
    expect(f.months.at(-1)).toEqual({ label: 'Oct', facture: 60000, encaisse: 60000 });
    expect(f.months.at(-2)).toEqual({ label: 'Sept', facture: 50000, encaisse: 20000 });
    expect(f.moyens).toEqual([
      { label: 'Mobile Money', montant: 60000, pct: 75 },
      { label: 'Espèces', montant: 20000, pct: 25 },
      { label: 'Virement', montant: 0, pct: 0 },
    ]);
  });

  it('computes what is still owed on open dossiers only', () => {
    const open = [
      row({ stage: 2, paye: 20000 }),
      row({ stage: 4, montantSupplement: 5000, paye: 55000 }),
      row({ stage: 5, paye: 0 }),
      row({ stage: 0, paye: 0 }),
    ];
    expect(computeFinance([], open, NOW).reste).toBe(30000);
  });

  it('cuts months in Bénin time (UTC+1)', () => {
    // 30 Sept 23:30 UTC is already 1 Oct in Cotonou.
    const f = computeFinance([row({ createdAt: new Date('2026-09-30T23:30:00Z') })], [], NOW);
    expect(f.months.at(-1)?.facture).toBe(50000);
    expect(financeWindowStart(NOW).toISOString()).toBe('2026-04-30T23:00:00.000Z');
  });
});
