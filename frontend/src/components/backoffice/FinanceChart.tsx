'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { fmtF2 } from '@/lib/format';

// #financeChart — DESIGN-SPEC.md section "9. Tableau de bord", "Functional
// behavior — configuration exacte du graphique Chart.js". Config values
// (colors, fonts, dash pattern, tooltip format) copied verbatim from
// educbenin-prototype.html's renderFinanceChart().

const FIN_MONTHS = ['Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept'];
const FIN_FACTURE = [1250000, 1400000, 1600000, 1800000, 2100000, 2450000];
const FIN_ENCAISSE = [1100000, 1300000, 1450000, 1600000, 1850000, 2000000];

export function FinanceChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: FIN_MONTHS,
        datasets: [
          {
            label: 'Facturé',
            data: FIN_FACTURE,
            borderColor: '#9490AC',
            borderDash: [4, 3],
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#9490AC',
            fill: false,
            tension: 0.3,
          },
          {
            label: 'Encaissé',
            data: FIN_ENCAISSE,
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79,70,229,.10)',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#4F46E5',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 9,
              boxHeight: 9,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { family: 'IBM Plex Sans', size: 11.5 },
              color: '#655F80',
            },
          },
          tooltip: {
            backgroundColor: '#1E1B33',
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: 'IBM Plex Sans', weight: 600 },
            bodyFont: { family: 'IBM Plex Mono' },
            callbacks: {
              label: (item) => `${item.dataset.label} : ${fmtF2(item.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9490AC', font: { family: 'IBM Plex Sans', size: 11.5 } },
          },
          y: {
            grid: { color: '#E4E1F0' },
            border: { display: false },
            ticks: {
              color: '#9490AC',
              font: { family: 'IBM Plex Mono', size: 10.5 },
              callback: (v) => `${(Number(v) / 1000000).toFixed(1)}M`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div style={{ height: 210, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Graphique d'évolution des montants facturés et encaissés sur 6 mois"
      />
    </div>
  );
}
