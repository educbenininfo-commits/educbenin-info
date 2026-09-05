import { describe, it, expect, vi } from 'vitest';
import { generateReference } from './reference';

function fakeTx(count: number) {
  return { dossier: { count: vi.fn().mockResolvedValue(count) } };
}

describe('generateReference', () => {
  it('formats as EB-MMYYYY-NNN with a 3-digit zero-padded sequence', async () => {
    const tx = fakeTx(0);
    const ref = await generateReference(tx, new Date('2026-09-15T00:00:00Z'));
    expect(ref).toBe('EB-092026-001');
  });

  it('increments from the existing count for that month', async () => {
    const tx = fakeTx(41);
    const ref = await generateReference(tx, new Date('2026-09-15T00:00:00Z'));
    expect(ref).toBe('EB-092026-042');
  });

  it('scopes the count query to the current month-year prefix', async () => {
    const tx = fakeTx(0);
    await generateReference(tx, new Date('2026-01-05T00:00:00Z'));
    expect(tx.dossier.count).toHaveBeenCalledWith({
      where: { reference: { startsWith: 'EB-012026-' } },
    });
  });

  it('pads a single-digit month with a leading zero', async () => {
    const tx = fakeTx(0);
    const ref = await generateReference(tx, new Date('2026-03-01T00:00:00Z'));
    expect(ref).toBe('EB-032026-001');
  });

  it('does not truncate once the monthly sequence exceeds 999', async () => {
    const tx = fakeTx(999);
    const ref = await generateReference(tx, new Date('2026-09-01T00:00:00Z'));
    expect(ref).toBe('EB-092026-1000');
  });
});
