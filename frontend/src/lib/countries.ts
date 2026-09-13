// World country list for CountrySelect / CountryPhoneInput — nationalité,
// pays d'obtention (diplôme), indicatif téléphonique. ISO2 codes + dial
// codes come from `libphonenumber-js` (already a dependency for phone
// formatting, ~245 codes incl. territories); we only supply the French
// display name here, which that library doesn't carry. No flag assets are
// stored — a flag emoji is derived from the ISO2 code at runtime via the
// Unicode regional-indicator trick (`flagEmoji`), so adding a country here
// never requires an image.
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

// French names for the ISO2 codes we actually want to offer. Deliberately
// excludes a handful of tiny uninhabited/dependent territories that
// libphonenumber-js still carries a dial code for (e.g. "AC" Ascension) —
// anything not listed here is silently dropped from the dropdown rather
// than shown with a raw ISO2 code as its "name".
const FRENCH_NAMES: Record<string, string> = {
  BJ: 'Bénin',
  AF: 'Afghanistan',
  ZA: 'Afrique du Sud',
  AL: 'Albanie',
  DZ: 'Algérie',
  DE: 'Allemagne',
  AD: 'Andorre',
  AO: 'Angola',
  AG: 'Antigua-et-Barbuda',
  SA: 'Arabie saoudite',
  AR: 'Argentine',
  AM: 'Arménie',
  AU: 'Australie',
  AT: 'Autriche',
  AZ: 'Azerbaïdjan',
  BS: 'Bahamas',
  BH: 'Bahreïn',
  BD: 'Bangladesh',
  BB: 'Barbade',
  BY: 'Biélorussie',
  BE: 'Belgique',
  BZ: 'Belize',
  BM: 'Bermudes',
  BT: 'Bhoutan',
  BO: 'Bolivie',
  BA: 'Bosnie-Herzégovine',
  BW: 'Botswana',
  BR: 'Brésil',
  BN: 'Brunei',
  BG: 'Bulgarie',
  BF: 'Burkina Faso',
  BI: 'Burundi',
  KH: 'Cambodge',
  CM: 'Cameroun',
  CA: 'Canada',
  CV: 'Cap-Vert',
  CL: 'Chili',
  CN: 'Chine',
  CY: 'Chypre',
  CO: 'Colombie',
  KM: 'Comores',
  CG: 'Congo-Brazzaville',
  CD: 'Congo (RDC)',
  KR: 'Corée du Sud',
  KP: 'Corée du Nord',
  CR: 'Costa Rica',
  CI: "Côte d'Ivoire",
  HR: 'Croatie',
  CU: 'Cuba',
  DK: 'Danemark',
  DJ: 'Djibouti',
  DO: 'République dominicaine',
  DM: 'Dominique',
  EG: 'Égypte',
  AE: 'Émirats arabes unis',
  EC: 'Équateur',
  ER: 'Érythrée',
  ES: 'Espagne',
  EE: 'Estonie',
  SZ: 'Eswatini',
  US: 'États-Unis',
  ET: 'Éthiopie',
  FJ: 'Fidji',
  FI: 'Finlande',
  FR: 'France',
  GA: 'Gabon',
  GM: 'Gambie',
  GE: 'Géorgie',
  GH: 'Ghana',
  GR: 'Grèce',
  GD: 'Grenade',
  GT: 'Guatemala',
  GN: 'Guinée',
  GQ: 'Guinée équatoriale',
  GW: 'Guinée-Bissau',
  GY: 'Guyana',
  HT: 'Haïti',
  HN: 'Honduras',
  HU: 'Hongrie',
  IN: 'Inde',
  ID: 'Indonésie',
  IQ: 'Irak',
  IR: 'Iran',
  IE: 'Irlande',
  IS: 'Islande',
  IL: 'Israël',
  IT: 'Italie',
  JM: 'Jamaïque',
  JP: 'Japon',
  JO: 'Jordanie',
  KZ: 'Kazakhstan',
  KE: 'Kenya',
  KG: 'Kirghizistan',
  KI: 'Kiribati',
  KW: 'Koweït',
  LA: 'Laos',
  LS: 'Lesotho',
  LV: 'Lettonie',
  LB: 'Liban',
  LR: 'Liberia',
  LY: 'Libye',
  LI: 'Liechtenstein',
  LT: 'Lituanie',
  LU: 'Luxembourg',
  MK: 'Macédoine du Nord',
  MG: 'Madagascar',
  MY: 'Malaisie',
  MW: 'Malawi',
  MV: 'Maldives',
  ML: 'Mali',
  MT: 'Malte',
  MA: 'Maroc',
  MH: 'Marshall',
  MU: 'Maurice',
  MR: 'Mauritanie',
  MX: 'Mexique',
  FM: 'Micronésie',
  MD: 'Moldavie',
  MC: 'Monaco',
  MN: 'Mongolie',
  ME: 'Monténégro',
  MZ: 'Mozambique',
  MM: 'Myanmar',
  NA: 'Namibie',
  NR: 'Nauru',
  NP: 'Népal',
  NI: 'Nicaragua',
  NE: 'Niger',
  NG: 'Nigeria',
  NO: 'Norvège',
  NZ: 'Nouvelle-Zélande',
  OM: 'Oman',
  UG: 'Ouganda',
  UZ: 'Ouzbékistan',
  PK: 'Pakistan',
  PW: 'Palaos',
  PA: 'Panama',
  PG: 'Papouasie-Nouvelle-Guinée',
  PY: 'Paraguay',
  NL: 'Pays-Bas',
  PE: 'Pérou',
  PH: 'Philippines',
  PL: 'Pologne',
  PT: 'Portugal',
  QA: 'Qatar',
  RO: 'Roumanie',
  GB: 'Royaume-Uni',
  RU: 'Russie',
  RW: 'Rwanda',
  KN: 'Saint-Christophe-et-Niévès',
  SM: 'Saint-Marin',
  VC: 'Saint-Vincent-et-les-Grenadines',
  LC: 'Sainte-Lucie',
  SB: 'Salomon',
  SV: 'Salvador',
  WS: 'Samoa',
  ST: 'Sao Tomé-et-Principe',
  SN: 'Sénégal',
  RS: 'Serbie',
  SC: 'Seychelles',
  SL: 'Sierra Leone',
  SG: 'Singapour',
  SK: 'Slovaquie',
  SI: 'Slovénie',
  SO: 'Somalie',
  SD: 'Soudan',
  SS: 'Soudan du Sud',
  LK: 'Sri Lanka',
  SE: 'Suède',
  CH: 'Suisse',
  SR: 'Suriname',
  SY: 'Syrie',
  TJ: 'Tadjikistan',
  TZ: 'Tanzanie',
  TD: 'Tchad',
  CZ: 'Tchéquie',
  TH: 'Thaïlande',
  TL: 'Timor oriental',
  TG: 'Togo',
  TO: 'Tonga',
  TT: 'Trinité-et-Tobago',
  TN: 'Tunisie',
  TM: 'Turkménistan',
  TR: 'Turquie',
  TV: 'Tuvalu',
  UA: 'Ukraine',
  UY: 'Uruguay',
  VU: 'Vanuatu',
  VA: 'Vatican',
  VE: 'Venezuela',
  VN: 'Viêt Nam',
  YE: 'Yémen',
  ZM: 'Zambie',
  ZW: 'Zimbabwe',
};

export interface Country {
  iso2: string;
  nameFr: string;
  dialCode: string;
  flag: string;
}

/** Regional-indicator flag emoji derived from an ISO2 code — no image asset needed. */
export function flagEmoji(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('');
}

const available = getCountries().filter((iso2) => FRENCH_NAMES[iso2]);

export const COUNTRIES: Country[] = [
  // Bénin pinned first — primary market for this service.
  {
    iso2: 'BJ',
    nameFr: FRENCH_NAMES.BJ!,
    dialCode: getCountryCallingCode('BJ'),
    flag: flagEmoji('BJ'),
  },
  ...available
    .filter((iso2) => iso2 !== 'BJ')
    .map((iso2) => ({
      iso2,
      nameFr: FRENCH_NAMES[iso2]!,
      dialCode: getCountryCallingCode(iso2),
      flag: flagEmoji(iso2),
    }))
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr')),
];

export function findCountry(iso2: string | undefined | null): Country | undefined {
  if (!iso2) return undefined;
  return COUNTRIES.find((c) => c.iso2 === iso2.toUpperCase());
}

/**
 * Best-effort default country from the browser's locale (e.g. "fr-BJ" →
 * "BJ"). Most browsers report a bare language tag with no region
 * ("fr"), so this falls back to Bénin — a reasonable default for a
 * Bénin-based service, not a security-relevant guess; the field always
 * stays editable.
 */
export function detectDefaultCountry(): string {
  if (typeof navigator === 'undefined') return 'BJ';
  const locales =
    navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const locale of locales) {
    const region = locale?.split('-')[1]?.toUpperCase();
    if (region && findCountry(region)) return region;
  }
  return 'BJ';
}
