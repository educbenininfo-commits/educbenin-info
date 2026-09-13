'use client';

// Shared phone/WhatsApp input — a country flag+dial-code dropdown next to
// a text field whose formatting adapts to the selected country
// (`libphonenumber-js`'s AsYouType formatter). Replaces the old
// Bénin-only `+229 XX XX XX XX` regex-validated plain <input> used across
// DemandForm (WhatsApp), AuthDiplomeForm (téléphone) and TrackingDemo
// (lookup). Stores/returns the number in E.164 (e.g. "+22997000000") —
// same shape the existing `wa.me/` link-building code already expects
// (it strips non-digits anyway).
//
// Built directly on libphonenumber-js's data/formatting functions rather
// than a pre-styled phone-input package, so the markup stays plain
// <select>/<input> and inherits the project's own `.field` styles exactly
// (a drop-in UI library would fight the locked design system instead).
import { useEffect, useState } from 'react';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';
import { COUNTRIES, detectDefaultCountry, findCountry } from '@/lib/countries';

function splitE164(value: string): { iso2: string; national: string } {
  if (value) {
    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.country) {
      return { iso2: parsed.country, national: parsed.formatNational() };
    }
  }
  return { iso2: detectDefaultCountry(), national: '' };
}

export function CountryPhoneInput({
  value,
  onChange,
  error,
  id,
  required,
}: {
  value: string;
  onChange: (e164: string) => void;
  error?: boolean;
  id?: string;
  required?: boolean;
}) {
  const [iso2, setIso2] = useState(() => splitE164(value).iso2);
  const [national, setNational] = useState(() => splitE164(value).national);

  // Reconcile if the parent resets `value` externally (e.g. loading a
  // dossier to edit) after this component already mounted with its own
  // default.
  useEffect(() => {
    if (!value) return;
    const next = splitE164(value);
    setIso2(next.iso2);
    setNational(next.national);
    // Only re-sync from an external value change, not from our own typing.
    // (No react-hooks/exhaustive-deps plugin is configured in this repo's
    // eslint.config.mjs, so no disable directive is needed here.)
  }, [value]);

  function emit(nextIso2: string, nextNational: string) {
    const country = findCountry(nextIso2);
    if (!country) return;
    const formatted = new AsYouType(nextIso2 as never).input(nextNational);
    setNational(formatted);
    const parsed = parsePhoneNumberFromString(formatted, nextIso2 as never);
    if (parsed) {
      onChange(parsed.number);
    } else {
      // Not (yet) a recognizable number — still surface a best-effort
      // E.164 so the field is never silently empty while typing.
      onChange(`+${country.dialCode}${nextNational.replace(/\D/g, '')}`);
    }
  }

  const selected = findCountry(iso2);
  const example = selected ? `Ex. ${selected.dialCode === '229' ? '97 00 00 00' : ''}` : '';

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select
        aria-label="Indicatif pays"
        className={error ? 'err' : undefined}
        style={{ flex: '0 0 auto', width: 120 }}
        value={iso2}
        onChange={(e) => {
          setIso2(e.target.value);
          emit(e.target.value, national);
        }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {c.flag} +{c.dialCode}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        className={error ? 'err' : undefined}
        style={{ flex: 1 }}
        placeholder={example || 'Numéro'}
        value={national}
        required={required}
        onChange={(e) => emit(iso2, e.target.value)}
      />
    </div>
  );
}
