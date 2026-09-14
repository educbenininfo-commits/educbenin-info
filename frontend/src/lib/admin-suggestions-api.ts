// frontend/src/lib/admin-suggestions-api.ts — back-office Suggestions data layer.
import { api } from '@/lib/api';

export type SuggestionStatut = 'nouveau' | 'vu' | 'a_ajouter' | 'refuse';

export interface Suggestion {
  id: string;
  nom: string;
  contact: string;
  recherche: string;
  message: string | null;
  statut: SuggestionStatut;
  createdAt: string;
}

export interface SuggestionsResponse {
  items: Suggestion[];
  counts: Record<'all' | SuggestionStatut, number>;
}

export function fetchSuggestions(params: {
  statut: 'all' | SuggestionStatut;
  q?: string;
  sort: 'date' | 'statut';
}): Promise<SuggestionsResponse> {
  const qs = new URLSearchParams({ statut: params.statut, sort: params.sort });
  if (params.q) qs.set('q', params.q);
  return api(`/api/admin/suggestions?${qs.toString()}`);
}

export function updateSuggestionStatut(
  id: string,
  statut: SuggestionStatut,
): Promise<{ suggestion: Suggestion }> {
  return api(`/api/admin/suggestions/${id}`, { method: 'PATCH', body: { statut } });
}
