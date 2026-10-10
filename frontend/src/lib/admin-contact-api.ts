// Back-office "Contact & messages" data layer.
import { api } from '@/lib/api';
import type { ContactSettings } from '@/lib/contact-display';

export type ContactMessageStatut = 'nouveau' | 'lu' | 'traite';

export interface ContactMessage {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  sujet: string | null;
  message: string;
  statut: ContactMessageStatut;
  createdAt: string;
}

export function fetchContactSettings(): Promise<{ settings: ContactSettings }> {
  return api('/api/admin/contact-settings');
}

export function updateContactSettings(
  settings: ContactSettings,
): Promise<{ settings: ContactSettings }> {
  return api('/api/admin/contact-settings', { method: 'PATCH', body: settings });
}

export function fetchContactMessages(params: {
  statut: 'all' | ContactMessageStatut;
  q?: string;
}): Promise<{ items: ContactMessage[]; counts: Record<'all' | ContactMessageStatut, number> }> {
  const qs = new URLSearchParams({ statut: params.statut });
  if (params.q) qs.set('q', params.q);
  return api(`/api/admin/contact-messages?${qs.toString()}`);
}

export function updateContactMessageStatut(
  id: string,
  statut: ContactMessageStatut,
): Promise<{ contactMessage: ContactMessage }> {
  return api(`/api/admin/contact-messages/${id}`, { method: 'PATCH', body: { statut } });
}
