// Public /contact form data layer. No auth/CSRF, same pattern as
// suggestions-public-api.ts.
import { API_URL } from './constants';

export class ContactApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ContactApiError';
  }
}

export interface CreateContactMessageInput {
  nom: string;
  email?: string;
  telephone?: string;
  sujet?: string;
  message: string;
}

export async function createContactMessage(input: CreateContactMessageInput): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ContactApiError(0, 'NETWORK_ERROR', 'Network error');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ContactApiError(
      res.status,
      body.error ?? 'UNKNOWN',
      body.message ?? 'Request failed',
    );
  }
}
