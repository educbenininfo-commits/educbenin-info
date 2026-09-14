// frontend/src/lib/admin-team-api.ts — Comptes admin & rôles data layer.
import { api } from '@/lib/api';

export type ModuleKey = 'dossiers' | 'dossiersRejetes' | 'specialites' | 'tarifs' | 'comptesAdmin';
export type PermLevel = 'manage' | 'read' | 'none';
export type ModulePermissions = Record<ModuleKey, PermLevel>;
export type BackofficeRole = 'ADMIN' | 'SUPERADMIN';
export type AdminLabel = 'ADMIN' | 'SUPPORT' | null;

export const MODULE_KEYS: ModuleKey[] = [
  'dossiers',
  'dossiersRejetes',
  'specialites',
  'tarifs',
  'comptesAdmin',
];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dossiers: 'Dossiers',
  dossiersRejetes: 'Rejetés',
  specialites: 'École & WhatsApp',
  tarifs: 'Tarifs',
  comptesAdmin: 'Comptes admin',
};

export function fullAccessPermissions(): ModulePermissions {
  return {
    dossiers: 'manage',
    dossiersRejetes: 'manage',
    specialites: 'manage',
    tarifs: 'manage',
    comptesAdmin: 'manage',
  };
}

export function supportDefaultPermissions(): ModulePermissions {
  return {
    dossiers: 'read',
    dossiersRejetes: 'read',
    specialites: 'none',
    tarifs: 'none',
    comptesAdmin: 'none',
  };
}

export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: BackofficeRole;
  adminLabel: AdminLabel;
  modulePermissions: ModulePermissions | null;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface PendingInvite {
  inviteId: string;
  email: string;
  name: string | null;
  role: BackofficeRole;
  adminLabel: AdminLabel;
  modulePermissions: ModulePermissions | null;
  status: 'PENDING' | 'EXPIRED';
  expiresAt: string;
}

export interface TeamResponse {
  members: TeamMember[];
  pendingInvites: PendingInvite[];
}

export function fetchTeam(): Promise<TeamResponse> {
  return api('/api/admin/team');
}

export function sendInvite(data: {
  email: string;
  name?: string;
  role: BackofficeRole;
  adminLabel?: AdminLabel;
  modulePermissions?: ModulePermissions;
}): Promise<{ id: string; email: string; expiresAt: string }> {
  return api('/api/admin/invites', { method: 'POST', body: data });
}

export function updateMemberRole(
  id: string,
  role: BackofficeRole,
): Promise<{ user: { id: string; role: string } }> {
  return api(`/api/admin/users/${id}/role`, { method: 'PATCH', body: { role } });
}

export function updateMemberPermissions(
  id: string,
  data: { adminLabel?: AdminLabel; modulePermissions: ModulePermissions },
): Promise<{ user: TeamMember }> {
  return api(`/api/admin/users/${id}/permissions`, { method: 'PATCH', body: data });
}

export function setMemberStatus(
  id: string,
  status: 'ACTIVE' | 'SUSPENDED',
): Promise<{ user: { id: string; status: string } }> {
  return api(`/api/admin/users/${id}/status`, { method: 'PATCH', body: { status } });
}

export function removeMember(id: string): Promise<{ ok: true }> {
  return api(`/api/admin/users/${id}/remove`, { method: 'POST' });
}
