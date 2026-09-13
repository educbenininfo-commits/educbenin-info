// frontend/src/lib/dossiers-public-api.ts
import { API_URL } from './constants';
import type { AuthForm } from './dossiers-data';

export class DossierApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'DossierApiError';
  }
}

// 30s — matches the authenticated api() wrapper's timeout. The public
// dossier/auth-form routes have no CSRF/auth to layer on, but they were
// missing this entirely: a stalled request just left "Envoi en cours…"
// spinning forever with no error ever surfacing.
const REQUEST_TIMEOUT_MS = 30_000;

async function postForm<T>(path: string, form: FormData): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new DossierApiError(0, 'TIMEOUT', 'La requête a expiré.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const code = typeof body.error === 'string' ? body.error : '';
    const message = typeof body.message === 'string' ? body.message : `Erreur ${res.status}`;
    throw new DossierApiError(res.status, code, message);
  }
  return res.json() as Promise<T>;
}

export async function createDossier(form: FormData): Promise<{ reference: string }> {
  return postForm('/api/dossiers', form);
}

export interface PublicComment {
  id: string;
  text: string;
  createdAt: string;
}

export interface LookupResult {
  reference: string;
  stage: number;
  motifRejet: string | null;
  ficheUploaded: boolean;
  recepisseUrl: string | null;
  comments: PublicComment[];
}

export async function lookupDossier(
  reference: string,
  whatsapp: string,
): Promise<{ ok: true; data: LookupResult } | { ok: false; status: number }> {
  const qs = new URLSearchParams({ reference, whatsapp }).toString();
  const res = await fetch(`${API_URL}/api/dossiers/lookup?${qs}`);
  if (!res.ok) return { ok: false, status: res.status };
  const data = (await res.json()) as LookupResult;
  return { ok: true, data };
}

export async function uploadFiche(form: FormData): Promise<{ ok: true }> {
  return postForm('/api/dossiers/lookup/fiche', form);
}

export type AuthTokenState =
  | { valid: true; reference: string; authFormData: AuthForm | null }
  | { valid: false; reason: 'invalid' | 'expired' | 'already-submitted' | 'wrong-stage' };

export async function fetchAuthFormState(token: string): Promise<AuthTokenState> {
  const res = await fetch(`${API_URL}/api/dossiers/auth-form/${encodeURIComponent(token)}`);
  return res.json() as Promise<AuthTokenState>;
}

export async function submitAuthForm(token: string, form: FormData): Promise<{ ok: true }> {
  return postForm(`/api/dossiers/auth-form/${encodeURIComponent(token)}`, form);
}

export interface CorrectionPrefill {
  nom: string;
  prenom: string;
  whatsapp: string;
  nationalite: string | null;
  specialtyCodes: string[];
}

export type CorrectionTokenState =
  | { valid: true; reference: string; prefill: CorrectionPrefill }
  | { valid: false; reason: 'invalid' | 'expired' | 'wrong-stage' };

export async function fetchCorrectionState(token: string): Promise<CorrectionTokenState> {
  const res = await fetch(`${API_URL}/api/dossiers/correction/${encodeURIComponent(token)}`);
  return res.json() as Promise<CorrectionTokenState>;
}

export async function submitCorrection(token: string, form: FormData): Promise<{ ok: true }> {
  return postForm(`/api/dossiers/correction/${encodeURIComponent(token)}`, form);
}
