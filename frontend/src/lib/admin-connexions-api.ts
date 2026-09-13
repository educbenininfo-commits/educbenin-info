// frontend/src/lib/admin-connexions-api.ts — "Connexions" back-office page
// data layer. Backed by GET /api/admin/connexions (SUPERADMIN only, cursor
// paginated over AdminAction rows with action IN auth.login/auth.logout).
import { api } from '@/lib/api';

export type AuthEventAction = 'auth.login' | 'auth.logout';

export interface AuthEventRow {
  id: string;
  actorId: string;
  action: AuthEventAction;
  metadata: { email?: string; name?: string | null } | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuthEventsPage {
  items: AuthEventRow[];
  nextCursor: string | null;
}

export function fetchAuthEvents(cursor?: string | null): Promise<AuthEventsPage> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return api(`/api/admin/connexions${qs}`);
}
