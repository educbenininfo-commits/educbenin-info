import { describe, expect, it } from 'vitest';
import { dossierPrice } from './dossier-pricing';

describe('dossierPrice', () => {
  it('charges the base price only for one specialty', () => {
    expect(dossierPrice(50000, 25000, 1)).toEqual({ base: 50000, supplement: 0, total: 50000 });
  });

  it('adds the supplement for every specialty after the first', () => {
    expect(dossierPrice(50000, 25000, 2).total).toBe(75000);
    expect(dossierPrice(50000, 25000, 3)).toEqual({
      base: 50000,
      supplement: 50000,
      total: 100000,
    });
  });

  it('treats a missing supplement or no specialty as zero extra', () => {
    expect(dossierPrice(50000, null, 3).total).toBe(50000);
    expect(dossierPrice(50000, 25000, 0).total).toBe(50000);
  });
});
