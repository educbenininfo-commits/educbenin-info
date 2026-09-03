// 27 spécialités du D.E.S. de la FSS — docs/design-reference/DESIGN-SPEC.md,
// section "4. Spécialités" (table exacte) / educbenin-prototype.html `SPECIALTIES`.
// Ordre exact du tableau source — c'est aussi cet ordre qui détermine les 6
// premières tuiles affichées sur l'Accueil.

export type Specialty = {
  code: string;
  name: string;
  date: string;
  heure: string;
  salle: string;
};

export const SPECIALTIES: Specialty[] = [
  {
    code: 'ANR',
    name: 'Anesthésie-Réanimation',
    date: '21-24/07/2026',
    heure: '08H',
    salle: 'GAM/FSS',
  },
  { code: 'BCL', name: 'Biologie Clinique', date: '22/07/2026', heure: '09H', salle: 'A2/FSS' },
  {
    code: 'BIO',
    name: 'Biologie Médicale et Sciences Fondamentales',
    date: 'À confirmer',
    heure: 'À confirmer',
    salle: 'A2/FSS',
  },
  {
    code: 'CAR',
    name: 'Cardiologie',
    date: '27-28/07/2026',
    heure: 'À confirmer',
    salle: 'GAM/FSS',
  },
  { code: 'CHG', name: 'Chirurgie Générale', date: '21-23/07/2026', heure: '09H', salle: 'A2/FSS' },
  {
    code: 'CHP',
    name: 'Chirurgie Pédiatrique',
    date: '21-22/07/2026',
    heure: 'À confirmer',
    salle: 'A2/FSS',
  },
  {
    code: 'DER',
    name: 'Dermatologie-Vénérologie',
    date: '22-27/07/2026',
    heure: '09H',
    salle: 'A2/FSS',
  },
  {
    code: 'GOB',
    name: 'Gynécologie-Obstétrique',
    date: '27-28/07/2026',
    heure: '10H',
    salle: 'GAM/FSS',
  },
  {
    code: 'HGE',
    name: 'Hépatologie-Gastroentérologie',
    date: '22-23/07/2026',
    heure: '08H',
    salle: 'A2/FSS',
  },
  {
    code: 'RIM',
    name: 'Imagerie Médicale',
    date: '27-29/07/2026',
    heure: '09H',
    salle: 'CNHU-HKM',
  },
  {
    code: 'MUR',
    name: "Médecine d'Urgence",
    date: '27-28/07/2026',
    heure: '08H',
    salle: 'GAM/FSS',
  },
  {
    code: 'MIN',
    name: 'Médecine Interne',
    date: '21-22/07/2026',
    heure: 'À confirmer',
    salle: 'A2/FSS',
  },
  {
    code: 'MPR',
    name: 'Médecine Physique et Réadaptation',
    date: '23/07/2026',
    heure: '08H',
    salle: 'A2/FSS',
  },
  {
    code: 'NEP',
    name: 'Néphrologie',
    date: '27-29/07/2026',
    heure: 'À confirmer',
    salle: 'A2/FSS',
  },
  { code: 'NCH', name: 'Neurochirurgie', date: '20-23/07/2026', heure: '08H', salle: 'A5/FSS' },
  { code: 'NEU', name: 'Neurologie', date: '23/07/2026', heure: 'À confirmer', salle: 'A5/FSS' },
  { code: 'OPH', name: 'Ophtalmologie', date: '27/07/2026', heure: '09H', salle: 'A2/FSS' },
  {
    code: 'ORL',
    name: 'Oto-Rhino-Laryngologie',
    date: '20/07/2026',
    heure: '09H',
    salle: 'CNHU-HKM',
  },
  { code: 'PED', name: 'Pédiatrie', date: '21-24/07/2026', heure: '08H', salle: 'A2/FSS' },
  { code: 'PPS', name: 'Pédopsychiatrie', date: '27-28/07/2026', heure: '08H', salle: 'CNHU-HKM' },
  { code: 'PNE', name: 'Pneumologie', date: '27/07/2026', heure: '09H', salle: 'LAZARET' },
  {
    code: 'PSY',
    name: "Psychiatrie d'Adultes",
    date: '27-28/07/2026',
    heure: '09H',
    salle: 'CNHU-HKM',
  },
  { code: 'RHU', name: 'Rhumatologie', date: '23-24/07/2026', heure: '08H', salle: 'GAM/FSS' },
  { code: 'SAT', name: 'Santé au Travail', date: '22/07/2026', heure: '09H', salle: 'GAM/FSS' },
  {
    code: 'SPU',
    name: 'Santé Publique',
    date: 'À confirmer',
    heure: 'À confirmer',
    salle: 'À confirmer',
  },
  {
    code: 'ORT',
    name: 'Traumatologie-Orthopédie',
    date: '21-23/07/2026',
    heure: '09H',
    salle: 'A5/FSS',
  },
  {
    code: 'URO',
    name: 'Urologie-Andrologie',
    date: '21-23/07/2026',
    heure: '09H',
    salle: 'A2/FSS',
  },
];
