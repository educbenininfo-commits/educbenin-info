// Pure helpers for the first-party visit statistics (PageView rows written by
// POST /api/track, read by GET /api/admin/analytics). No I/O here so the
// classification rules stay unit-testable and shared between both routes.

export type Granularity = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/** Window covered by each granularity (bucket count × bucket size). */
export const GRANULARITY_CONFIG: Record<
  Granularity,
  { label: string; buckets: number; trunc: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' }
> = {
  minute: { label: 'Par minute (60 dernières minutes)', buckets: 60, trunc: 'minute' },
  hour: { label: 'Par heure (24 dernières heures)', buckets: 24, trunc: 'hour' },
  day: { label: 'Par jour (30 derniers jours)', buckets: 30, trunc: 'day' },
  week: { label: 'Par semaine (12 dernières semaines)', buckets: 12, trunc: 'week' },
  month: { label: 'Par mois (12 derniers mois)', buckets: 12, trunc: 'month' },
  year: { label: 'Par année (5 dernières années)', buckets: 5, trunc: 'year' },
};

export const GRANULARITIES = Object.keys(GRANULARITY_CONFIG) as Granularity[];

export function isGranularity(v: unknown): v is Granularity {
  return typeof v === 'string' && v in GRANULARITY_CONFIG;
}

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|embedly|preview|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|node-fetch|go-http/i;

export function isBot(ua: string | null | undefined): boolean {
  if (!ua) return true;
  return BOT_RE.test(ua);
}

export type Device = 'mobile' | 'tablet' | 'desktop';

export function deviceFromUA(ua: string | null | undefined): Device {
  if (!ua) return 'desktop';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export const DEVICE_LABELS: Record<Device, string> = {
  mobile: 'Mobile',
  tablet: 'Tablette',
  desktop: 'Ordinateur',
};

/** Ordered: first match wins. Matched against the referrer host. */
const SOURCE_RULES: Array<[RegExp, string]> = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)(duckduckgo|yahoo|qwant|ecosia|yandex)\./, 'Autres moteurs'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'Facebook'],
  [/(^|\.)(instagram\.com)$/, 'Instagram'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X (Twitter)'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
  [/(^|\.)(tiktok\.com)$/, 'TikTok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)(t\.me|telegram\.org)$/, 'Telegram'],
];

const UTM_ALIASES: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  fb: 'Facebook',
  instagram: 'Instagram',
  ig: 'Instagram',
  whatsapp: 'WhatsApp',
  wa: 'WhatsApp',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  telegram: 'Telegram',
};

/**
 * Where a visit came from: an explicit `utm_source` wins, then the referrer
 * host (known networks, else the bare host), else "Accès direct". A referrer
 * on our own site counts as direct — it's internal navigation.
 */
export function classifySource(
  referrer: string | null | undefined,
  utmSource: string | null | undefined,
  ownHost: string | null | undefined,
): string {
  const utm = utmSource?.trim().toLowerCase();
  if (utm) return UTM_ALIASES[utm] ?? utm.slice(0, 40);

  if (!referrer) return 'Accès direct';
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'Accès direct';
  }
  const own = ownHost
    ?.toLowerCase()
    .replace(/^www\./, '')
    .split(':')[0];
  if (!host || (own && host === own)) return 'Accès direct';
  for (const [re, name] of SOURCE_RULES) if (re.test(host)) return name;
  return host.slice(0, 60);
}

/** Paths that are never tracked (back-office, auth, API). */
export function isTrackablePath(path: string): boolean {
  return !/^\/(admin|connexion|api|auth)(\/|$)/.test(path);
}

// ── API shapes ──────────────────────────────────────────────────────────────
export interface AnalyticsBreakdownRow {
  key: string;
  count: number;
}

export interface AnalyticsResponse {
  granularity: Granularity;
  live: number;
  buckets: Array<{ key: string; views: number; visits: number; visitors: number }>;
  totals: { views: number; visits: number; visitors: number };
  sources: AnalyticsBreakdownRow[];
  countries: AnalyticsBreakdownRow[];
  pages: AnalyticsBreakdownRow[];
  devices: AnalyticsBreakdownRow[];
}

export interface LiveVisitorsResponse {
  live: number;
  pages: AnalyticsBreakdownRow[];
}

/** "Live" = distinct visitors with a page view in this trailing window. */
export const LIVE_WINDOW_MS = 5 * 60 * 1000;

// ── Time buckets ────────────────────────────────────────────────────────────
// Statistics are bucketed in Bénin local time. Africa/Porto-Novo is a fixed
// UTC+1 (no DST), so local wall-clock = UTC + 1h and the SQL side can use the
// same zone name. Bucket keys are local "YYYY-MM-DDTHH:mm" strings, matching
// the to_char() format of the analytics query.
export const ANALYTICS_TZ = 'Africa/Porto-Novo';
const TZ_OFFSET_MS = 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a "local-as-UTC" Date (fields read with getUTC*) as a bucket key. */
function keyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Truncates a local-as-UTC date to the start of its bucket (weeks start Monday, like Postgres). */
function truncLocal(d: Date, g: Granularity): Date {
  const t = new Date(d.getTime());
  t.setUTCSeconds(0, 0);
  if (g === 'minute') return t;
  t.setUTCMinutes(0);
  if (g === 'hour') return t;
  t.setUTCHours(0);
  if (g === 'day') return t;
  if (g === 'week') {
    const dow = (t.getUTCDay() + 6) % 7; // Monday = 0
    t.setUTCDate(t.getUTCDate() - dow);
    return t;
  }
  t.setUTCDate(1);
  if (g === 'month') return t;
  t.setUTCMonth(0);
  return t;
}

function stepLocal(d: Date, g: Granularity, n: number): Date {
  const t = new Date(d.getTime());
  if (g === 'minute') t.setUTCMinutes(t.getUTCMinutes() + n);
  else if (g === 'hour') t.setUTCHours(t.getUTCHours() + n);
  else if (g === 'day') t.setUTCDate(t.getUTCDate() + n);
  else if (g === 'week') t.setUTCDate(t.getUTCDate() + 7 * n);
  else if (g === 'month') t.setUTCMonth(t.getUTCMonth() + n);
  else t.setUTCFullYear(t.getUTCFullYear() + n);
  return t;
}

/**
 * The ordered bucket keys covering the granularity's window, ending with the
 * bucket containing `now`, plus the UTC instant where the window starts.
 */
export function bucketWindow(g: Granularity, now: Date): { keys: string[]; startUtc: Date } {
  const { buckets } = GRANULARITY_CONFIG[g];
  const current = truncLocal(new Date(now.getTime() + TZ_OFFSET_MS), g);
  const first = stepLocal(current, g, -(buckets - 1));
  const keys: string[] = [];
  for (let i = 0; i < buckets; i++) keys.push(keyOf(stepLocal(first, g, i)));
  return { keys, startUtc: new Date(first.getTime() - TZ_OFFSET_MS) };
}

const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/** Short French axis label for a bucket key ("14:05", "14 h", "12 sept.", "sept. 2026", "2026"). */
export function bucketLabel(key: string, g: Granularity): string {
  const [date = '', time = '00:00'] = key.split('T');
  const [y = '', m = '1', d = '1'] = date.split('-');
  const month = MONTHS_SHORT[Number(m) - 1] ?? m;
  if (g === 'minute') return time;
  if (g === 'hour') return `${time.slice(0, 2)} h`;
  if (g === 'day' || g === 'week') return `${Number(d)} ${month}`;
  if (g === 'month') return `${month} ${y}`;
  return y;
}

const COUNTRY_NAMES = new Intl.DisplayNames(['fr'], { type: 'region' });

export function countryLabel(code: string | null | undefined): string {
  if (!code) return 'Inconnu';
  try {
    return COUNTRY_NAMES.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
