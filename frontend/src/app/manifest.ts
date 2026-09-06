import type { MetadataRoute } from 'next';

// Next.js special file — auto-served at /manifest.webmanifest and linked
// from every page's <head>. Backs the floating install prompt
// (components/pwa/InstallPrompt.tsx): Android/Chrome needs a valid manifest
// for `beforeinstallprompt` to fire at all.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Educ Bénin',
    short_name: 'Educ Bénin',
    description:
      'Accompagnement du dossier de probatoire spécialité — FSS/UAC. Service indépendant.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4F46E5',
    icons: [
      { src: '/icon.png', sizes: '32x32', type: 'image/png' },
      { src: '/logo/mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
