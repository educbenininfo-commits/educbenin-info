// frontend/src/lib/dossiers-data.ts
// Type + formatting layer for the back-office Dossiers screens — mirrors the
// Prisma `Dossier`/`DossierComment` models
// (docs/superpowers/specs/2026-09-03-dossiers-backend-design.md §4) on the
// wire. STAGE_NAMES/DOSSIER_FILTERS/initials/pillClass/fmtF are unchanged
// from the original static-data version (educbenin-prototype.html) — only
// the row shape moved from a hardcoded example dict to the real API's JSON.

import { SPECIALTIES } from './specialties';

export type AuthForm = {
  nom: string;
  prenom: string;
  naissance: string;
  lieuNaissance: string;
  nationalite: string;
  adresse: string;
  piece: string;
  pieceRef: string;
  email: string;
  tel: string;
  bac: { institution: string; email: string; annee: string; pays: string; adresse: string };
  doctorat: { institution: string; email: string; annee: string; pays: string; adresse: string };
};

export type DossierComment = {
  id: string;
  dossierId: string;
  type: 'public' | 'internal';
  text: string;
  authorName: string;
  createdAt: string;
};

export type DossierListItem = {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
  specialtyCodes: string[];
  stage: 0 | 1 | 2 | 3 | 4 | 5;
  stageChangedAt: string;
  motifRejet: string | null;
};

export type DossierDetail = DossierListItem & {
  whatsapp: string;
  pieceJointeUrl: string | null;
  authToken: string | null;
  authTokenExpiresAt: string | null;
  authSentAt: string | null;
  authSubmittedAt: string | null;
  authFormData: AuthForm | null;
  diplomaBacUrl: string | null;
  diplomaDoctoratUrl: string | null;
  ficheUploaded: boolean;
  ficheUrl: string | null;
  recepisseUploaded: boolean;
  recepisseUrl: string | null;
  montant: number;
  montantSupplement: number | null;
  paye: number;
  moyen: 'Non renseigné' | 'Mobile Money' | 'Espèces' | 'Virement';
  motifRejet: string | null;
  createdAt: string;
  updatedAt: string;
  comments: DossierComment[];
};

export const STAGE_NAMES: Record<number, string> = {
  0: 'Dossier rejeté',
  1: 'Dossier en cours de traitement',
  2: 'Authentification du diplôme en cours',
  3: 'Inscription en ligne',
  4: 'Dépôt de dossier en cours',
  5: 'Dossier déposé avec succès',
};

export const DOSSIER_FILTERS: { label: string; stage: 'all' | 1 | 2 | 3 | 4 | 5 }[] = [
  { label: 'Tous', stage: 'all' },
  { label: 'En cours de traitement', stage: 1 },
  { label: 'Authentification diplôme', stage: 2 },
  { label: 'Inscription en ligne', stage: 3 },
  { label: 'Dépôt en cours', stage: 4 },
  { label: 'Déposé avec succès', stage: 5 },
];

export function initials(name: string): string {
  const parts = name.replace('Dr. ', '').split(' ');
  return (parts[0]![0]! + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

export function pillClass(stage: number): 'danger' | 'ok' | 'warn' | 'neutral' {
  if (stage === 0) return 'danger';
  if (stage === 5) return 'ok';
  if (stage >= 3) return 'warn';
  return 'neutral';
}

export function fmtF(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

export function displayName(nom: string, prenom: string): string {
  return `${nom} ${prenom}`;
}

export function specialtyLabel(codes: string[]): string {
  return codes.map((code) => SPECIALTIES.find((s) => s.code === code)?.name ?? code).join(', ');
}

/** Time-since-last-stage-change for the dossier-list "days" column. */
export function formatElapsed(stage: number, stageChangedAt: string | Date): string {
  if (stage === 5) return '—';
  const changed = typeof stageChangedAt === 'string' ? new Date(stageChangedAt) : stageChangedAt;
  const hours = Math.max(0, Math.floor((Date.now() - changed.getTime()) / (3600 * 1000)));
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

/** Relative "il y a X h/j" for comment timestamps. */
export function formatRelativeTime(at: string | Date): string {
  const date = typeof at === 'string' ? new Date(at) : at;
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / (3600 * 1000)));
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

/**
 * Absolute "DD/MM/YYYY HH:MM" for comment timestamps — shown alongside
 * formatRelativeTime per explicit user request: every public/internal
 * comment must show its exact date and time, not only a relative fuzz.
 * Built manually (not `toLocaleString`) so the format doesn't depend on
 * the Node build's ICU data.
 */
export function formatDateTime(at: string | Date): string {
  const date = typeof at === 'string' ? new Date(at) : at;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
