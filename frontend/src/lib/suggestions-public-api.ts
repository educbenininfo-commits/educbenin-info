// frontend/src/lib/suggestions-public-api.ts — public "Suggérer" form data
// layer (home page + École — INMeS). No auth/CSRF, matches
// dossiers-public-api.ts's pattern.
import { API_URL } from './constants';

export class SuggestionApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'SuggestionApiError';
  }
}

export interface CreateSuggestionInput {
  nom: string;
  contact: string;
  recherche: string;
  message?: string;
}

export async function createSuggestion(input: CreateSuggestionInput): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/suggestions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new SuggestionApiError(0, 'NETWORK_ERROR', 'Network error');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new SuggestionApiError(
      res.status,
      body.error ?? 'UNKNOWN',
      body.message ?? 'Request failed',
    );
  }
}
