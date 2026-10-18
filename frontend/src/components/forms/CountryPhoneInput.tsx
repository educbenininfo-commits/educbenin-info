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
// Custom dropdown instead of a native <select>, with real SVG flag icons
// (country-flag-icons — the same author as libphonenumber-js, ships one
// SVG per ISO2 code) instead of the Unicode regional-indicator emoji trick
// `lib/countries.ts` used to rely on: Windows doesn't ship colored flag
// glyphs in its default fonts, so those emoji rendered as a bare two-letter
// tag ("FR") — both inside a native <select> and in plain page content —
// on every Windows browser, not just inside <select>.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AsYouType, getExampleNumber, parsePhoneNumberFromString } from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { COUNTRIES, countryMatches, detectDefaultCountry, findCountry } from '@/lib/countries';

function Flag({ iso2 }: { iso2: string }) {
  const Icon = FlagIcons[iso2.toUpperCase() as keyof typeof FlagIcons];
  return Icon ? <Icon className="flag-icon" /> : <span className="flag-icon" />;
}

function splitE164(
  value: string,
  fallbackIso2 = detectDefaultCountry(),
): { iso2: string; national: string } {
  if (value) {
    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.country) {
      return { iso2: parsed.country, national: parsed.formatNational() };
    }
  }
  return { iso2: fallbackIso2, national: '' };
}

function exampleFor(iso2: string): string {
  const example = getExampleNumber(iso2 as never, examples);
  return example ? example.formatNational() : '';
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
  // Server render and first client render both start on Bénin (the visitor's
  // country cookie isn't readable during SSR); the mount effect below then
  // switches an empty field to the visitor's actual country.
  const [iso2, setIso2] = useState(() => splitE164(value, 'BJ').iso2);
  const [national, setNational] = useState(() => splitE164(value, 'BJ').national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // The E.164 string we ourselves last emitted via onChange. A controlled
  // parent echoes it straight back down as `value` on the next render —
  // without this guard, the reconciliation effect below would re-derive
  // iso2/national from that echo and, for a not-yet-valid number (e.g. the
  // country was just switched with the digits field still empty), fail to
  // parse it and silently reset iso2 to the browser-locale default. That
  // was the "changing the country prefix doesn't work" bug: pick France,
  // the field immediately snaps back to Bénin.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (!value || value === lastEmitted.current) return;
    const next = splitE164(value);
    setIso2(next.iso2);
    setNational(next.national);
    // Only re-sync from a genuinely external value change (e.g. loading a
    // dossier to edit), not from our own emit's echo. (No
    // react-hooks/exhaustive-deps plugin is configured in this repo's
    // eslint.config.mjs, so no disable directive is needed here.)
  }, [value]);

  useEffect(() => {
    if (!value) setIso2(detectDefaultCountry());
    // Mount only: never override a country the person already picked.
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    searchRef.current?.focus();
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  function emit(nextIso2: string, nextNational: string) {
    const country = findCountry(nextIso2);
    if (!country) return;
    const formatted = new AsYouType(nextIso2 as never).input(nextNational);
    setNational(formatted);
    const parsed = parsePhoneNumberFromString(formatted, nextIso2 as never);
    const e164 = parsed
      ? parsed.number
      : // Not (yet) a recognizable number — still surface a best-effort
        // E.164 so the field is never silently empty while typing.
        `+${country.dialCode}${nextNational.replace(/\D/g, '')}`;
    lastEmitted.current = e164;
    onChange(e164);
  }

  function selectCountry(nextIso2: string) {
    setIso2(nextIso2);
    setOpen(false);
    emit(nextIso2, national);
  }

  const selected = findCountry(iso2);
  const filtered = useMemo(() => COUNTRIES.filter((c) => countryMatches(c, query)), [query]);
  const placeholder = useMemo(() => {
    const number = exampleFor(iso2);
    return number ? `Ex. ${number}` : 'Numéro';
  }, [iso2]);

  return (
    <div className={`phone-input${error ? ' err' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="phone-input-country"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Indicatif pays"
        onClick={() => setOpen((o) => !o)}
      >
        {selected && <Flag iso2={selected.iso2} />}
        <span>+{selected?.dialCode}</span>
        <span className="chev">▾</span>
      </button>

      {open && (
        <div className="phone-input-list">
          <input
            ref={searchRef}
            type="search"
            className="phone-input-search"
            placeholder="Rechercher un pays…"
            aria-label="Rechercher un pays"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter') {
                e.preventDefault();
                const first = filtered[0];
                if (first) selectCountry(first.iso2);
              }
            }}
          />
          <ul role="listbox">
            {filtered.map((c) => (
              <li key={c.iso2}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.iso2 === iso2}
                  className={c.iso2 === iso2 ? 'on' : undefined}
                  onClick={() => selectCountry(c.iso2)}
                >
                  <Flag iso2={c.iso2} />
                  <span className="name">{c.nameFr}</span>
                  <span className="code">+{c.dialCode}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="phone-input-empty">Aucun pays trouvé</li>}
          </ul>
        </div>
      )}

      <input
        id={id}
        type="tel"
        inputMode="tel"
        placeholder={placeholder}
        value={national}
        required={required}
        onChange={(e) => emit(iso2, e.target.value)}
      />
    </div>
  );
}
