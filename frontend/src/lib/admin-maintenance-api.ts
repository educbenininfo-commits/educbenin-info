// frontend/src/lib/admin-maintenance-api.ts — Tableau de bord's "mode
// maintenance" toggle data layer (SUPERADMIN only, see the route's comment).
import { api } from '@/lib/api';

export function fetchMaintenanceState(): Promise<{ enabled: boolean }> {
  return api('/api/admin/maintenance');
}

export function setMaintenanceMode(enabled: boolean): Promise<{ enabled: boolean }> {
  return api('/api/admin/maintenance', { method: 'POST', body: { enabled } });
}
