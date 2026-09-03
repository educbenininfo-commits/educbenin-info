// DOSSIERS — educbenin-prototype.html (10 example dossiers, stage 0=rejeté
// .. 5=déposé). DESIGN-SPEC.md section "10. Dossiers": d10 was added
// specifically to demonstrate the "never sent" auth-form state — with it,
// all 3 states of the auth button are directly demonstrable (d10 → send,
// d5 → awaiting, d4 → view, the only one carrying a full authForm).

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

export type Dossier = {
  ref: string;
  name: string;
  spec: string;
  wa: string;
  stage: 0 | 1 | 2 | 3 | 4 | 5;
  authSent: boolean;
  authSubmitted: boolean;
  ficheUploaded: boolean;
  recepisseUploaded: boolean;
  days: string;
  montant: number;
  paye: number;
  moyen: 'Non renseigné' | 'Mobile Money' | 'Espèces' | 'Virement';
  authForm?: AuthForm;
  motif?: string;
};

export const STAGE_NAMES: Record<number, string> = {
  0: 'Dossier rejeté',
  1: 'Dossier en cours de traitement',
  2: 'Authentification du diplôme en cours',
  3: 'Inscription en ligne',
  4: 'Dépôt de dossier en cours',
  5: 'Dossier déposé avec succès',
};

export const INITIAL_DOSSIERS: Record<string, Dossier> = {
  d1: {
    ref: 'EB-2026-000388',
    name: 'Dr. Houngbo Estelle',
    spec: 'Pédiatrie',
    wa: '+229 96 44 12 09',
    stage: 1,
    authSent: false,
    authSubmitted: false,
    ficheUploaded: false,
    recepisseUploaded: false,
    days: '1 j',
    montant: 50000,
    paye: 50000,
    moyen: 'Mobile Money',
  },
  d2: {
    ref: 'EB-2026-000377',
    name: 'Dr. Adjovi Roméo',
    spec: 'Chirurgie Générale',
    wa: '+229 97 20 55 31',
    stage: 1,
    authSent: false,
    authSubmitted: false,
    ficheUploaded: false,
    recepisseUploaded: false,
    days: '4 j',
    montant: 100000,
    paye: 50000,
    moyen: 'Espèces',
  },
  d3: {
    ref: 'EB-2026-000390',
    name: 'Dr. Codjo Sènan',
    spec: 'Gynécologie-Obstétrique',
    wa: '+229 95 10 44 02',
    stage: 1,
    authSent: false,
    authSubmitted: false,
    ficheUploaded: false,
    recepisseUploaded: false,
    days: '2 j',
    montant: 50000,
    paye: 0,
    moyen: 'Non renseigné',
  },
  d4: {
    ref: 'EB-2026-000401',
    name: 'Dr. Sossou Théodore',
    spec: 'Cardiologie',
    wa: '+229 96 12 34 56',
    stage: 2,
    authSent: true,
    authSubmitted: true,
    ficheUploaded: false,
    recepisseUploaded: false,
    days: '5 j',
    montant: 50000,
    paye: 50000,
    moyen: 'Mobile Money',
    authForm: {
      nom: 'SOSSOU',
      prenom: 'Théodore',
      naissance: '14/03/1988',
      lieuNaissance: 'Cotonou, Bénin',
      nationalite: 'Béninoise',
      adresse: 'Fidjrossè, Cotonou, Bénin',
      piece: 'CNI',
      pieceRef: 'B-04422190',
      email: 'theodore.sossou@gmail.com',
      tel: '+229 96 12 34 56',
      bac: {
        institution: 'Office du Baccalauréat du Bénin',
        email: 'contact@obb.bj',
        annee: '2013',
        pays: 'Bénin',
        adresse: 'Cotonou, Bénin',
      },
      doctorat: {
        institution: 'FSS / UAC',
        email: 'scolarite@fss-uac.bj',
        annee: '2023',
        pays: 'Bénin',
        adresse: 'Campus FSS, Cotonou, Bénin',
      },
    },
  },
  d5: {
    ref: 'EB-2026-000399',
    name: 'Dr. Zannou Marlène',
    spec: 'Dermatologie-Vénérologie',
    wa: '+229 94 88 21 03',
    stage: 2,
    authSent: true,
    authSubmitted: false,
    ficheUploaded: false,
    recepisseUploaded: false,
    days: '2 j',
    montant: 50000,
    paye: 25000,
    moyen: 'Virement',
  },
  d6: {
    ref: 'EB-2026-000370',
    name: 'Dr. Dossou Prudence',
    spec: 'Néphrologie',
    wa: '+229 97 65 43 21',
    stage: 3,
    authSent: true,
    authSubmitted: true,
    ficheUploaded: true,
    recepisseUploaded: false,
    days: '3 j',
    montant: 50000,
    paye: 50000,
    moyen: 'Mobile Money',
  },
  d7: {
    ref: 'EB-2026-000360',
    name: 'Dr. Aina Landry',
    spec: 'Ophtalmologie',
    wa: '+229 96 77 88 12',
    stage: 4,
    authSent: true,
    authSubmitted: true,
    ficheUploaded: true,
    recepisseUploaded: false,
    days: '1 j',
    montant: 50000,
    paye: 50000,
    moyen: 'Espèces',
  },
  d8: {
    ref: 'EB-2026-000312',
    name: 'Dr. Kpossou Jonas',
    spec: 'Urologie-Andrologie',
    wa: '+229 95 22 11 90',
    stage: 5,
    authSent: true,
    authSubmitted: true,
    ficheUploaded: true,
    recepisseUploaded: true,
    days: '—',
    montant: 50000,
    paye: 50000,
    moyen: 'Mobile Money',
  },
  d9: {
    ref: 'EB-2026-000305',
    name: 'Dr. Fanou Sandrine',
    spec: "Psychiatrie d'Adultes",
    wa: '+229 94 33 66 77',
    stage: 5,
    authSent: true,
    authSubmitted: true,
    ficheUploaded: true,
    recepisseUploaded: true,
    days: '—',
    montant: 50000,
    paye: 50000,
    moyen: 'Mobile Money',
  },
  d10: {
    ref: 'EB-2026-000415',
    name: 'Dr. Agbodji Firmin',
    spec: 'Neurochirurgie',
    wa: '+229 93 40 12 88',
    stage: 2,
    authSent: false,
    authSubmitted: false,
    ficheUploaded: false,
    recepisseUploaded: false,
    days: '3 h',
    montant: 50000,
    paye: 0,
    moyen: 'Non renseigné',
  },
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
