'use client';

// Shared date-picker — replaces the free-text "JJ/MM/AAAA" placeholder
// input (previously unvalidated on both client and server) with a real
// calendar popover. Keeps the exact same external contract — a
// "JJ/MM/AAAA" string — so the server's `naissance: z.string().min(1)`
// validation and existing stored data need no change; only the input
// mechanism changes.
//
// No calendar library: the need is narrow (a single birth-date field, no
// range selection, no timezone handling) and a hand-rolled popover keeps
// full control over styling per the project's locked design system.
import { useEffect, useRef, useState } from 'react';

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
const WEEKDAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function parseDDMMYYYY(value: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function DatePicker({
  value,
  onChange,
  error,
  id,
  required,
}: {
  value: string;
  onChange: (ddmmyyyy: string) => void;
  error?: boolean;
  id?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseDDMMYYYY(value);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? new Date().getFullYear() - 25);
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? 0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, i) => currentYear - i);

  function pick(day: number) {
    onChange(formatDDMMYYYY(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id={id}
          className={error ? 'err' : undefined}
          placeholder="JJ/MM/AAAA"
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          aria-label="Ouvrir le calendrier"
          onClick={() => setOpen((v) => !v)}
        >
          📅
        </button>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            zIndex: 60,
            background: 'var(--prod-surface)',
            border: '1px solid var(--prod-border)',
            borderRadius: 12,
            padding: 12,
            boxShadow: '0 20px 50px -16px rgba(20, 15, 60, 0.35)',
            width: 280,
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select
              aria-label="Mois"
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              style={{ flex: 1 }}
            >
              {MONTHS_FR.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              aria-label="Année"
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              style={{ width: 90 }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              textAlign: 'center',
            }}
          >
            {WEEKDAYS_FR.map((w, i) => (
              <div
                key={`${w}-${i}`}
                style={{ fontSize: 11, color: 'var(--prod-ink-faint)', fontWeight: 600 }}
              >
                {w}
              </div>
            ))}
            {cells.map((day, i) => {
              const isSelected =
                parsed &&
                day === parsed.getDate() &&
                viewMonth === parsed.getMonth() &&
                viewYear === parsed.getFullYear();
              return day ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(day)}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 0',
                    fontSize: 13,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--prod-primary)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--prod-ink)',
                    fontFamily: 'inherit',
                  }}
                >
                  {day}
                </button>
              ) : (
                <div key={i} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
