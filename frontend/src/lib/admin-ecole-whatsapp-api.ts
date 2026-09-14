// frontend/src/lib/admin-ecole-whatsapp-api.ts — back-office "École &
// WhatsApp" data layer (11-backoffice-ecole-whatsapp.md).
import { api } from '@/lib/api';

export interface AdminCategorie {
  id: string;
  libelle: string;
  libelleCourt: string | null;
  typeAdmission: 'dossier' | 'concours_ou_composition' | string;
}

export interface AdminEcole {
  id: string;
  nom: string;
  description: string | null;
  lienWhatsappGeneral: string | null;
  categories: AdminCategorie[];
}

export function fetchAdminEcoles(): Promise<{ items: AdminEcole[] }> {
  return api('/api/admin/ecoles');
}

export function createEcole(data: {
  nom: string;
  lienWhatsappGeneral?: string;
}): Promise<{ ecole: AdminEcole }> {
  return api('/api/admin/ecoles', { method: 'POST', body: data });
}

export function updateEcoleWhatsapp(
  id: string,
  lienWhatsappGeneral: string,
): Promise<{ ecole: AdminEcole }> {
  return api(`/api/admin/ecoles/${id}`, { method: 'PATCH', body: { lienWhatsappGeneral } });
}

export interface AdminFiliere {
  id: string;
  nom: string;
  code: string | null;
  date: string | null;
  heure: string | null;
  salle: string | null;
  lienWhatsapp: string | null;
  categorieId: string;
  categorieLabel: string;
  typeAdmission: string;
}

export function fetchAdminFilieres(
  ecoleId: string,
  categorieId: string = 'all',
): Promise<{ items: AdminFiliere[] }> {
  return api(
    `/api/admin/filieres?ecoleId=${encodeURIComponent(ecoleId)}&categorieId=${encodeURIComponent(categorieId)}`,
  );
}

export function updateFiliere(
  id: string,
  data: {
    nom?: string;
    date?: string | null;
    heure?: string | null;
    salle?: string | null;
    lienWhatsapp?: string | null;
  },
): Promise<{ filiere: AdminFiliere }> {
  return api(`/api/admin/filieres/${id}`, { method: 'PATCH', body: data });
}
