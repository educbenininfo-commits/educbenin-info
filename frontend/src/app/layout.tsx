import type { Metadata } from 'next';
import { Lexend, Outfit, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { PageViewTracker } from '@/components/PageViewTracker';
import { THEME_STORAGE_KEY } from '@/lib/theme';

// Blocking inline script — runs before hydration so an explicit Clair/Sombre
// choice (persisted in localStorage) applies before first paint, avoiding a
// flash of the wrong theme. "Système" (nothing stored) sets no attribute at
// all; globals.css's prefers-color-scheme media query handles that case with
// no JS needed. Kept in sync with ThemeToggle.tsx's THEME_STORAGE_KEY.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

// Typography (2026-10 redesign): Lexend for body/UI, Outfit for headings and
// key figures, IBM Plex Mono kept for data (references, dates). Self-hosted
// via next/font/google — no render-blocking request.
const lexend = Lexend({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-head',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
  display: 'swap',
});

const SITE_URL = 'https://www.educbenin.info';
const SITE_DESCRIPTION =
  "Educ Bénin accompagne les médecins candidats aux 27 spécialités de la FSS : rassemblement des pièces, authentification de diplôme, inscription en ligne et dépôt du dossier — avec un suivi clair à chaque étape. Service indépendant, sans affiliation avec la FSS ni l'UAC.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Educ Bénin — Accompagnement du dossier de probatoire spécialité FSS/UAC',
    template: '%s | Educ Bénin',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'Educ Bénin',
    'probatoire spécialité',
    'dossier de probatoire',
    'FSS UAC',
    'FSS Bénin',
    'UAC Bénin',
    'authentification de diplôme',
    'inscription CUO-SIGAN',
    'D.E.S. FSS',
    'spécialité médicale Bénin',
    'Cotonou',
  ],
  authors: [{ name: 'Educ Bénin' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Educ Bénin',
    url: SITE_URL,
    title: 'Educ Bénin — Accompagnement du dossier de probatoire spécialité FSS/UAC',
    description: SITE_DESCRIPTION,
    images: [{ url: '/logo/lockup-dark.svg', width: 512, height: 512, alt: 'Educ Bénin' }],
  },
  twitter: {
    card: 'summary',
    title: 'Educ Bénin — Accompagnement du dossier de probatoire spécialité FSS/UAC',
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${lexend.variable} ${outfit.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className={lexend.className}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
        <InstallPrompt />
        <PageViewTracker />
      </body>
    </html>
  );
}
