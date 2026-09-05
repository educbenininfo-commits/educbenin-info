// frontend/src/lib/dossiers-admin-api.ts
import { api } from '@/lib/api';
import { API_URL, COOKIE_PREFIX } from '@/lib/constants';
import type { DossierDetail, DossierListItem, DossierComment } from './dossiers-data';

export async function fetchDossiers(
  stage: 'all' | 0 | 1 | 2 | 3 | 4 | 5,
): Promise<{ items: DossierListItem[]; counts: Record<string, number> }> {
  return api(`/api/admin/dossiers?stage=${stage}`);
}

export async function fetchDossierDetail(id: string): Promise<{ dossier: DossierDetail }> {
  return api(`/api/admin/dossiers/${id}`);
}

export async function updateDossierPayment(
  id: string,
  data: { montant?: number; montantSupplement?: number | null; paye?: number; moyen?: string },
): Promise<{ dossier: DossierDetail }> {
  return api(`/api/admin/dossiers/${id}`, { method: 'PATCH', body: data });
}

export async function sendAuthForm(
  id: string,
): Promise<{ token: string; authTokenExpiresAt: string }> {
  return api(`/api/admin/dossiers/${id}/auth-send`, { method: 'POST' });
}

export async function rejectDossier(
  id: string,
  motif: string,
): Promise<{ dossier: DossierDetail }> {
  return api(`/api/admin/dossiers/${id}/reject`, { method: 'POST', body: { motif } });
}

export async function restoreDossier(id: string): Promise<{ dossier: DossierDetail }> {
  return api(`/api/admin/dossiers/${id}/restore`, { method: 'POST' });
}

export async function advanceDossier(id: string): Promise<{ dossier: DossierDetail }> {
  return api(`/api/admin/dossiers/${id}/advance`, { method: 'POST' });
}

export async function addDossierComment(
  id: string,
  type: 'public' | 'internal',
  text: string,
): Promise<{ comment: DossierComment }> {
  return api(`/api/admin/dossiers/${id}/comments`, { method: 'POST', body: { type, text } });
}

// `api()` (frontend/src/lib/api.ts, PROTECTED) always JSON.stringify()s the
// body and sets Content-Type: application/json — incompatible with a
// multipart file upload. This duplicates just the CSRF-cookie lookup
// `api.ts` already does internally (it isn't exported) rather than editing
// the protected file for one endpoint.
function getCsrfToken(): string | null {
  if (typeof window === 'undefined') return null;
  const key = `${COOKIE_PREFIX}-csrf`;
  const fromStorage = localStorage.getItem(key);
  if (fromStorage) return fromStorage;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export async function uploadRecepisse(id: string, file: File): Promise<{ dossier: DossierDetail }> {
  const form = new FormData();
  form.append('file', file);
  const csrfToken = getCsrfToken();
  const res = await fetch(`${API_URL}/api/admin/dossiers/${id}/recepisse`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const message = typeof body.message === 'string' ? body.message : `Erreur ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<{ dossier: DossierDetail }>;
}
