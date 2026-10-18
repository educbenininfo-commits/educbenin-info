'use client';

// Tableau de bord — "Évolution des encaissements". Real monthly figures
// computed server-side (lib/server/dossiers/finance.ts) and passed down by
// the dashboard page from /api/admin/dossiers/summary.
import { TrendChart, type TrendSeries } from '@/components/backoffice/TrendChart';
import { fmtF2 } from '@/lib/format';

export function FinanceChart({
  months,
}: {
  months: { label: string; facture: number; encaisse: number }[];
}) {
  const series: TrendSeries[] = [
    { label: 'Encaissé', data: months.map((m) => m.encaisse) },
    { label: 'Facturé', data: months.map((m) => m.facture), dashed: true },
  ];
  return (
    <TrendChart
      labels={months.map((m) => m.label)}
      series={series}
      height={230}
      formatValue={fmtF2}
      ariaLabel="Graphique d'évolution des montants facturés et encaissés sur 6 mois"
    />
  );
}
