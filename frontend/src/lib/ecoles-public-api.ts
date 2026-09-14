// frontend/src/lib/ecoles-public-api.ts — public "École / Faculté" nav
// dropdown data layer. No auth, no CSRF — a plain public GET, so this
// skips the authenticated api() wrapper (used for admin/CSRF-protected
// calls) in favor of a small best-effort fetch, matching the pattern in
// dossiers-public-api.ts.
import { API_URL } from './constants';

export interface PublicEcole {
  id: string;
  nom: string;
  description: string | null;
}

/** Never throws — a nav dropdown failing silently beats breaking the page. */
export async function fetchPublicEcoles(): Promise<PublicEcole[]> {
  try {
    const res = await fetch(`${API_URL}/api/ecoles`);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: PublicEcole[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}
