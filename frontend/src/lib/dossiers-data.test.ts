import { describe, it, expect } from 'vitest';
import { matchesDossierSearch, type DossierListItem } from './dossiers-data';

function item(overrides: Partial<DossierListItem> = {}): DossierListItem {
  return {
    id: 'd1',
    reference: 'EB-202609-003',
    nom: 'DOSSOU',
    prenom: 'Horace',
    whatsapp: '+229 97 00 00 00',
    specialtyCodes: [],
    stage: 1,
    stageChangedAt: new Date().toISOString(),
    motifRejet: null,
    ...overrides,
  };
}

describe('matchesDossierSearch', () => {
  it('matches on nom alone', () => {
    expect(matchesDossierSearch(item(), 'DOSSOU')).toBe(true);
  });

  it('matches on prenom alone', () => {
    expect(matchesDossierSearch(item(), 'Horace')).toBe(true);
  });

  it('matches the full name as displayed ("nom prenom")', () => {
    expect(matchesDossierSearch(item(), 'DOSSOU Horace')).toBe(true);
  });

  it('matches the full name typed the other way round ("prenom nom")', () => {
    expect(matchesDossierSearch(item(), 'Horace Dossou')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchesDossierSearch(item(), 'dossou horace')).toBe(true);
  });

  it('matches on reference', () => {
    expect(matchesDossierSearch(item(), 'EB-202609-003')).toBe(true);
  });

  it('matches on whatsapp', () => {
    expect(matchesDossierSearch(item(), '97 00 00 00')).toBe(true);
  });

  it('returns true for an empty/blank query (no filter applied)', () => {
    expect(matchesDossierSearch(item(), '')).toBe(true);
    expect(matchesDossierSearch(item(), '   ')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesDossierSearch(item(), 'Adjahoui')).toBe(false);
  });
});
