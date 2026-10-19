// Price of a dossier — shared by the D.E.S. form (live total shown to the
// candidate) and POST /api/dossiers (amount stored on the dossier), so what
// the candidate sees is exactly what gets billed. Both inputs come from the
// back-office Tarifs screen: `base` = Categorie.tarifDepart (1st specialty),
// `supplement` = Categorie.supplementSpecialite (each specialty after it).

export interface DossierPrice {
  base: number;
  /** Total of the per-specialty supplements (0 for a single specialty). */
  supplement: number;
  total: number;
}

export function dossierPrice(
  base: number | null | undefined,
  supplement: number | null | undefined,
  specialtyCount: number,
): DossierPrice {
  const b = base ?? 0;
  const extra = Math.max(0, specialtyCount - 1) * (supplement ?? 0);
  return { base: b, supplement: extra, total: b + extra };
}
