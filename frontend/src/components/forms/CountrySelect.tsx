'use client';

// Shared country dropdown for nationalité / pays fields — reused across
// DemandForm, AuthDiplomeForm (nationalité + bac.pays + doctorat.pays).
// Plain <select> styled via the existing `.field select` rules
// (globals.css) so it matches every other form control pixel-for-pixel;
// no new visual language introduced.
import { COUNTRIES } from '@/lib/countries';

export function CountrySelect({
  value,
  onChange,
  error,
  id,
  required,
}: {
  value: string;
  onChange: (iso2: string) => void;
  error?: boolean;
  id?: string;
  required?: boolean;
}) {
  return (
    <select
      id={id}
      className={error ? 'err' : undefined}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Sélectionnez un pays…
      </option>
      {COUNTRIES.map((c) => (
        <option key={c.iso2} value={c.iso2}>
          {c.flag} {c.nameFr}
        </option>
      ))}
    </select>
  );
}
