// Pure, framework-agnostic display helpers for the multi-school extension —
// safe on both server and client (no 'server-only', no DB access). Shared
// so every page/component derives the same slug/badge/description from an
// Ecole/Categorie row instead of re-inventing the rule per screen.

export interface EcoleLike {
  nom: string;
  description: string | null;
}

export interface CategorieLike {
  libelle: string;
}

export interface CategorieWithFiliereCount extends CategorieLike {
  _count: { filieres: number };
}

/**
 * Routing slug for an Ecole — top-level path (e.g. /fss, /inmes), confirmed
 * by the 02-08 reference screenshots' browser chrome. Ecole has no
 * dedicated `slug` field (not part of the locked data-model spec), so the
 * short `nom` lowercased is the routing key. Revisit if a future school's
 * `nom` isn't URL-safe.
 */
export function ecoleSlug(nom: string): string {
  return nom.toLowerCase();
}

/** Badge abbreviation shown in a circular/rounded tile: "FSS" → "FSS", "INMeS" → "IN". */
export function ecoleBadge(nom: string): string {
  return nom.length <= 3 ? nom.toUpperCase() : nom.slice(0, 2).toUpperCase();
}

/**
 * One-sentence description of an Ecole's programs, built from its real
 * Categorie.libelle values — never hand-authored per school, so a new
 * Categorie added via the back-office is reflected here with no code
 * change (deliberately simpler than the reference mockup's editorial
 * copy, which isn't mechanically derivable from the data model — flagged
 * to the user rather than reverse-engineered).
 */
export function ecoleDescription(categories: CategorieLike[]): string {
  return `${categories.map((c) => c.libelle).join(', ')}.`;
}

/**
 * Single "highlight" pill for an Ecole card (e.g. "27 spécialités D.E.S."
 * or "Cycle I & Cycle II"). Rule, generic across any current/future
 * school: if one Categorie's filière count exceeds FLAGSHIP_THRESHOLD,
 * name it ("{count} spécialités {abbrev}", abbrev = the parenthesised
 * part of its libelle if present, else the full libelle); otherwise list
 * every Categorie's libelle joined with " & ". Exactly reproduces both
 * reference examples (FSS → D.E.S.'s 27; INMeS → "Cycle I & Cycle II")
 * without hardcoding either school.
 */
const FLAGSHIP_THRESHOLD = 5;

export function ecoleHighlightPill(categories: CategorieWithFiliereCount[]): string {
  let flagship: CategorieWithFiliereCount | null = null;
  for (const c of categories) {
    if (!flagship || c._count.filieres > flagship._count.filieres) flagship = c;
  }
  if (flagship && flagship._count.filieres > FLAGSHIP_THRESHOLD) {
    const abbrev = flagship.libelle.match(/\(([^)]+)\)/)?.[1] ?? flagship.libelle;
    return `${flagship._count.filieres} spécialités ${abbrev}`;
  }
  return categories.map((c) => c.libelle).join(' & ');
}

const VOWEL_SOUND_RE = /^[AEIOUHÀÉÈÊÎÔÛ]/i;

/**
 * "la FSS" vs "l'INMeS" — heuristic elision by first-letter vowel sound
 * (mechanically correct for both known schools). A future school whose
 * acronym starts with a consonant LETTER that sounds like a vowel (e.g.
 * "HEC") would need a manual override — not handled here.
 */
export function ecoleElidedArticle(nom: string): string {
  return VOWEL_SOUND_RE.test(nom) ? `l’${nom}` : `la ${nom}`;
}

/**
 * CSS modifier for the `.badge-ecole` class (10-backoffice-dossiers.md,
 * 11-backoffice-ecole-whatsapp.md, 13-backoffice-tarifs.md) — indigo for
 * FSS, violet-gray for anything else (INMeS today; a third school reuses
 * the same generic "other institution" tint rather than inventing a new
 * color per school, since only two variants exist in the palette so far).
 */
export function ecoleBadgeClass(nom: string): 'fss' | 'inmes' {
  return nom.toUpperCase() === 'FSS' ? 'fss' : 'inmes';
}
