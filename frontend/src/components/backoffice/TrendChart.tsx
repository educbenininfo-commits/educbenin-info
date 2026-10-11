'use client';

// Shared line chart for the back-office (finances, visit statistics):
// thin straight line, no dots until hover, soft gradient fill under the
// first series, dashed horizontal grid only, compact French y-axis ticks
// ("12,5 k"). Chart.js draws to a <canvas>, so theme colours are resolved
// from the --prod-* tokens at render time and the chart re-renders on any
// theme change (explicit [data-theme] or the live system preference).
// Pass memoised / module-level labels, series and formatValue: they
// are effect dependencies, so fresh literals each render would redraw it.
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export interface TrendSeries {
  label: string;
  data: number[];
  /** CSS colour; defaults to the primary token for the first series. */
  color?: string;
  dashed?: boolean;
}

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
// Module-level so the default prop is referentially stable (it's an effect dependency).
const formatCompact = (n: number) => compact.format(n);

function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function withAlpha(color: string, alpha: number): string {
  const m = color.match(/^#([0-9a-f]{6})$/i);
  if (!m) return color;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function TrendChart({
  labels,
  series,
  height = 240,
  formatValue = formatCompact,
  ariaLabel,
}: {
  labels: string[];
  series: TrendSeries[];
  height?: number;
  formatValue?: (n: number) => string;
  ariaLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    function render() {
      chartRef.current?.destroy();
      const primary = token('--prod-primary', '#1d4ed8');
      const inkFaint = token('--prod-ink-faint', '#64748b');
      const border = token('--prod-border', '#e2e8f0');
      const ink = token('--prod-ink', '#0f172a');
      const surface = token('--prod-surface', '#ffffff');

      chartRef.current = new Chart(ctx!, {
        type: 'line',
        data: {
          labels,
          datasets: series.map((s, i) => {
            const color = s.color ?? (i === 0 ? primary : inkFaint);
            const gradient = ctx!.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, withAlpha(color, 0.18));
            gradient.addColorStop(1, withAlpha(color, 0));
            return {
              label: s.label,
              data: s.data,
              borderColor: color,
              backgroundColor: i === 0 ? gradient : 'transparent',
              borderWidth: 2,
              borderDash: s.dashed ? [5, 4] : [],
              fill: i === 0,
              tension: 0,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBackgroundColor: color,
              pointHoverBorderColor: surface,
              pointHoverBorderWidth: 2,
            };
          }),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: series.length > 1,
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 8,
                boxHeight: 8,
                usePointStyle: true,
                pointStyle: 'circle',
                font: { family: 'Lexend', size: 12 },
                color: inkFaint,
              },
            },
            tooltip: {
              backgroundColor: ink,
              titleColor: surface,
              bodyColor: surface,
              padding: 10,
              cornerRadius: 10,
              displayColors: series.length > 1,
              titleFont: { family: 'Lexend', weight: 600 },
              bodyFont: { family: 'Lexend' },
              callbacks: {
                label: (item) =>
                  `${series.length > 1 ? `${item.dataset.label} : ` : ''}${formatValue(item.parsed.y ?? 0)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: inkFaint,
                font: { family: 'Lexend', size: 12 },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 7,
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: border },
              border: { display: false, dash: [4, 4] },
              ticks: {
                color: inkFaint,
                font: { family: 'Lexend', size: 12 },
                maxTicksLimit: 5,
                callback: (v) => compact.format(Number(v)),
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
  }, [labels, series, height, formatValue]);

  return (
    <div style={{ height, position: 'relative' }}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
    </div>
  );
}
