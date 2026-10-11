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
    // Splash screen shown by Android while the installed app starts: app
    // background + the 192/512 icons below (a 32px-only icon gave a blank
    // white splash).
    background_color: '#f7f9fc',
    theme_color: '#1d4ed8',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/logo/mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
