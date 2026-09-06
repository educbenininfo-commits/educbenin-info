import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.educbenin.info';

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
    {
      url: `${SITE_URL}/specialites`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/suivre-mon-dossier`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
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
