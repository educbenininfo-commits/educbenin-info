import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.educbenin.info';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/connexion',
        '/settings',
        '/auth/',
        '/authentification-diplome/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
