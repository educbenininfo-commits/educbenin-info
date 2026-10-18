import { afterEach, describe, expect, it, vi } from 'vitest';
import { countryMatches, detectDefaultCountry, findCountry } from './countries';

const benin = findCountry('BJ')!;
const france = findCountry('FR')!;

describe('countryMatches', () => {
  it('matches the French name ignoring case and accents', () => {
    expect(countryMatches(benin, 'benin')).toBe(true);
    expect(countryMatches(benin, 'BÉN')).toBe(true);
    expect(countryMatches(france, 'benin')).toBe(false);
  });

  it('matches the dial code with or without +, and the ISO code', () => {
    expect(countryMatches(benin, '+229')).toBe(true);
    expect(countryMatches(benin, '229')).toBe(true);
    expect(countryMatches(benin, 'bj')).toBe(true);
  });

  it('keeps every country for an empty query', () => {
    expect(countryMatches(france, '  ')).toBe(true);
  });
});

describe('detectDefaultCountry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the visitor's IP country cookie set by the middleware", () => {
    vi.stubGlobal('document', { cookie: 'app-csrf=x; eb-country=CI' });
    expect(detectDefaultCountry()).toBe('CI');
  });

  it('falls back to Bénin, never to the browser language', () => {
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('navigator', { language: 'fr-FR', languages: ['fr-FR'] });
    expect(detectDefaultCountry()).toBe('BJ');
  });
});
