// Stable, human-readable ids for the launch reference data (2 schools, 5
// categories) seeded by scripts/seed-schools.ts. Kept in one place so the
// seed script and any route/screen that needs to point at a specific
// school/category (e.g. the legacy single-school candidate flow, which
// always targets FSS/"Probatoire spécialité (D.E.S.)") share the exact
// same literal instead of duplicating magic strings.
//
// These are real primary-key values (Ecole.id / Categorie.id), not enum
// values — every Ecole/Categorie row created later (via a future
// back-office "add a school" screen) gets a normal generated cuid instead.

export const ECOLE_FSS_ID = 'ecole-fss';
export const ECOLE_INMES_ID = 'ecole-inmes';

export const CATEGORIE_FSS_LICENCE_ID = 'cat-fss-licence';
export const CATEGORIE_FSS_DES_ID = 'cat-fss-des';
export const CATEGORIE_FSS_MASTER_ID = 'cat-fss-master';
export const CATEGORIE_INMES_CYCLE1_ID = 'cat-inmes-cycle1';
export const CATEGORIE_INMES_CYCLE2_ID = 'cat-inmes-cycle2';
