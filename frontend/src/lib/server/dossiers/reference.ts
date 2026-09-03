import 'server-only';

/**
 * Generates the next `EB-YYYYMM-NNN` reference for the given month,
 * counting existing dossiers whose reference already carries that
 * prefix. Must be called INSIDE the same transaction that inserts the
 * new Dossier row (see POST /api/dossiers) — the caller is responsible
 * for retrying on a P2002 unique-constraint collision from a
 * near-simultaneous submission (two counts racing to the same number).
 */
export async function generateReference(
  tx: {
    dossier: { count: (args: { where: { reference: { startsWith: string } } }) => Promise<number> };
  },
  now: Date = new Date(),
): Promise<string> {
  const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const prefix = `EB-${yyyymm}-`;
  const count = await tx.dossier.count({ where: { reference: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(3, '0')}`;
}
