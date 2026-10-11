'use client';

// Tableau de bord — "Évolution des encaissements". Example data (no
// financial ledger exists yet, see the dashboard page's own comment).
import { TrendChart, type TrendSeries } from '@/components/backoffice/TrendChart';
import { fmtF2 } from '@/lib/format';

const FIN_MONTHS = ['Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept'];
const SERIES: TrendSeries[] = [
  { label: 'Encaissé', data: [1100000, 1300000, 1450000, 1600000, 1850000, 2000000] },
  {
    label: 'Facturé',
    data: [1250000, 1400000, 1600000, 1800000, 2100000, 2450000],
    dashed: true,
  },
];

export function FinanceChart() {
  return (
    <TrendChart
      labels={FIN_MONTHS}
      series={SERIES}
      height={230}
      formatValue={fmtF2}
      ariaLabel="Graphique d'évolution des montants facturés et encaissés sur 6 mois"
    />
  );
}
