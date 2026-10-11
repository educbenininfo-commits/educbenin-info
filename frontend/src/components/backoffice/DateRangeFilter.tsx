'use client';

import { CalendarDays, ChevronDown } from 'lucide-react';
import { DATE_RANGE_LABELS, type DateRangePreset } from '@/lib/date-range';

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangePreset;
  onChange: (next: DateRangePreset) => void;
}) {
  return (
    <label className="date-pill">
      <CalendarDays size={16} aria-hidden="true" />
      <span className="sr-only">Période</span>
      <select value={value} onChange={(e) => onChange(e.target.value as DateRangePreset)}>
        {(Object.keys(DATE_RANGE_LABELS) as DateRangePreset[]).map((key) => (
          <option key={key} value={key}>
            {DATE_RANGE_LABELS[key]}
          </option>
        ))}
      </select>
      <ChevronDown size={15} aria-hidden="true" />
    </label>
  );
}
