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

// Chart.js draws to a <canvas>, so it can't read the --prod-* CSS custom
// properties directly — these light/dark pairs mirror the ink-muted/
// ink-faint/border tokens in globals.css. Re-rendered on both an explicit
// [data-theme] change and a live system-preference change (the "Système"
// case has no attribute at all, so only the media query fires).
function isDarkMode(): boolean {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'dark') return true;
  if (explicit === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function FinanceChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    function render() {
      chartRef.current?.destroy();
      const dark = isDarkMode();
      const inkMuted = dark ? '#b6b1cc' : '#655F80';
      const inkFaint = dark ? '#8b86a3' : '#9490AC';
      const gridBorder = dark ? '#34304c' : '#E4E1F0';

      chartRef.current = new Chart(ctx!, {
        type: 'line',
        data: {
          labels: FIN_MONTHS,
          datasets: [
            {
              label: 'Facturé',
              data: FIN_FACTURE,
              borderColor: inkFaint,
              borderDash: [4, 3],
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: inkFaint,
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
                color: inkMuted,
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
              ticks: { color: inkFaint, font: { family: 'IBM Plex Sans', size: 11.5 } },
            },
            y: {
              grid: { color: gridBorder },
              border: { display: false },
              ticks: {
                color: inkFaint,
                font: { family: 'IBM Plex Mono', size: 10.5 },
                callback: (v) => `${(Number(v) / 1000000).toFixed(1)}M`,
              },
            },
          },
        },
      });
    }

    render();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', render);
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
      mq.removeEventListener('change', render);
      observer.disconnect();
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
