// frontend/src/lib/admin-tarifs-api.ts — back-office "Tarifs" data layer
// (13-backoffice-tarifs-personnalisables.md).
import { api } from '@/lib/api';

export type TarifMode = 'personnalise' | 'unique';

export interface AdminTarifCategorie {
  id: string;
  ecoleNom: string;
  libelle: string;
  libelleCourt: string | null;
  tarifDepart: number | null;
}

export interface TarifBaremeRow {
  id: string;
  mode: TarifMode;
  montants: Record<string, number> | null;
  montantUnique: number | null;
  regleSpecialitesAdditionnelles: string | null;
  effectiveFrom: string;
  createdByLabel: string;
  statut: 'Actif' | 'Archivé';
}

export interface TarifsResponse {
  categories: AdminTarifCategorie[];
  active: TarifBaremeRow | null;
  history: TarifBaremeRow[];
}

export function fetchTarifs(): Promise<TarifsResponse> {
  return api('/api/admin/tarifs');
}

export function saveTarifBareme(data: {
  mode: TarifMode;
  montants?: Record<string, number>;
  montantUnique?: number;
  regleSpecialitesAdditionnelles?: string;
}): Promise<{ id: string }> {
  return api('/api/admin/tarifs', { method: 'POST', body: data });
}
