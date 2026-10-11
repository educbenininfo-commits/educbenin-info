// Date-period presets shared by the back-office list screens' "Toutes les
// dates ▾" filter. Pure, client-safe.

export type DateRangePreset = 'all' | 'today' | '7d' | '30d' | 'month' | 'year';

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  all: 'Toutes les dates',
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  month: 'Ce mois-ci',
  year: 'Cette année',
};

/** Start of the period (inclusive), or null for "Toutes les dates". */
export function rangeStart(preset: DateRangePreset, now: Date = new Date()): Date | null {
  const d = new Date(now);
  switch (preset) {
    case 'all':
      return null;
    case 'today':
      d.setHours(0, 0, 0, 0);
      return d;
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
  }
}

export function inDateRange(
  iso: string | null | undefined,
  preset: DateRangePreset,
  now: Date = new Date(),
): boolean {
  const start = rangeStart(preset, now);
  if (!start) return true;
  if (!iso) return false;
  return new Date(iso).getTime() >= start.getTime();
}
