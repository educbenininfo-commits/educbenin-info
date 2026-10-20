import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.educbenin.info';

const DEMAND_PAGES = [
  '/fss/des',
  '/fss/medecine-pharmacie',
  '/fss/licence',
  '/fss/master',
  '/inmes/cycle-1',
  '/inmes/cycle-2',
];

// Public, indexable pages only — admin, auth, settings, and the
// token-scoped auth-diplome page are all excluded via metadata.robots on
// their own routes (see their layout.tsx/page.tsx) and via robots.ts below.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${SITE_URL}/accompagnement`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    { url: `${SITE_URL}/ecoles`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/fss`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/inmes`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    // Demand-form pages — what candidates actually search for ("probatoire
    // D.E.S.", "Master FSS", "INMeS cycle 1"…).
    ...DEMAND_PAGES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${SITE_URL}/suivre-mon-dossier`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    {
      url: `${SITE_URL}/non-affiliation`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/mentions-legales`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    { url: `${SITE_URL}/cgu-cgv`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    {
      url: `${SITE_URL}/confidentialite`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];
}
