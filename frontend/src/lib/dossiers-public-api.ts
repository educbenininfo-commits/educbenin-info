// frontend/src/lib/dossiers-public-api.ts
import { API_URL } from './constants';

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

async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', body: form });
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

export interface LookupResult {
  reference: string;
  stage: number;
  motifRejet: string | null;
  ficheUploaded: boolean;
  recepisseUrl: string | null;
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
  | { valid: true; reference: string }
  | { valid: false; reason: 'invalid' | 'expired' | 'already-submitted' | 'wrong-stage' };

export async function fetchAuthFormState(token: string): Promise<AuthTokenState> {
  const res = await fetch(`${API_URL}/api/dossiers/auth-form/${encodeURIComponent(token)}`);
  return res.json() as Promise<AuthTokenState>;
}

export async function submitAuthForm(token: string, form: FormData): Promise<{ ok: true }> {
  return postForm(`/api/dossiers/auth-form/${encodeURIComponent(token)}`, form);
}
