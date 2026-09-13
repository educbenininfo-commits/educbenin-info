// frontend/src/lib/admin-invite-public-api.ts — public "/invitation/[token]"
// data layer. No auth, no CSRF (the token itself is the mechanism) — mirrors
// dossiers-public-api.ts's timeout/error pattern for the same reason (a
// stalled request must surface an error, not spin forever).
import { API_URL } from '@/lib/constants';

export class InviteApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'InviteApiError';
  }
}

const REQUEST_TIMEOUT_MS = 30_000;

export type InviteTokenState =
  | { valid: true; email: string; isGmail: boolean }
  | { valid: false; error: string };

export async function fetchInviteState(token: string): Promise<InviteTokenState> {
  const res = await fetch(`${API_URL}/api/admin/invites/${encodeURIComponent(token)}`);
  return res.json() as Promise<InviteTokenState>;
}

export async function confirmInvite(
  token: string,
  password?: string,
): Promise<{ ok: true; isGmail: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/admin/invites/${encodeURIComponent(token)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(password ? { password } : {}),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new InviteApiError(0, 'TIMEOUT', 'La requête a expiré.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new InviteApiError(
      res.status,
      typeof body.error === 'string' ? body.error : 'UNKNOWN',
      typeof body.message === 'string' ? body.message : 'Une erreur est survenue.',
    );
  }
  return body as { ok: true; isGmail: boolean };
}
