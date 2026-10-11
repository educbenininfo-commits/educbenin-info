import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { getCategorieById, getEcoleBySlug, listEcolesForGrid } from './schools/queries';
import { getContactSettings } from './site-settings';

// Server-side data cache for the public pages (accueil, écoles, catégories,
// coordonnées). Those pages render on every request (the CI build has no
// database, so they can't be prerendered), but with these wrappers a visit
// no longer waits on a database round-trip — and after a cold start, no
// longer pays for opening a database connection at all. Entries live in
// Vercel's shared data cache, expire after 5 minutes, and are dropped
// immediately whenever the back-office edits public content (see
// revalidatePublicContent, called by the écoles / catégories / filières /
// tarifs / contact-settings admin routes). Back-office reads keep using
// the uncached functions directly.

export const PUBLIC_CONTENT_TAG = 'public-content';
const OPTIONS = { revalidate: 300, tags: [PUBLIC_CONTENT_TAG] };

export const cachedListEcolesForGrid = unstable_cache(listEcolesForGrid, ['ecoles-grid'], OPTIONS);
export const cachedGetEcoleBySlug = unstable_cache(getEcoleBySlug, ['ecole-by-slug'], OPTIONS);
export const cachedGetCategorieById = unstable_cache(
  getCategorieById,
  ['categorie-by-id'],
  OPTIONS,
);
export const cachedGetContactSettings = unstable_cache(
  getContactSettings,
  ['contact-settings'],
  OPTIONS,
);

/** Drops every cached public-content entry right away (after a back-office edit). */
export function revalidatePublicContent(): void {
  try {
    revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 });
  } catch {
    // Outside a Next request context (unit tests) there is no cache to drop.
  }
}
