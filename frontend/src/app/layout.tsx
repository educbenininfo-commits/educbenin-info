import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { THEME_STORAGE_KEY } from '@/lib/theme';

// Blocking inline script — runs before hydration so an explicit Clair/Sombre
// choice (persisted in localStorage) applies before first paint, avoiding a
// flash of the wrong theme. "Système" (nothing stored) sets no attribute at
// all; globals.css's prefers-color-scheme media query handles that case with
// no JS needed. Kept in sync with ThemeToggle.tsx's THEME_STORAGE_KEY.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

// Educ Bénin design system (docs/design-reference/DESIGN-SPEC.md — Fondations
// de design > Typographie): IBM Plex Sans for body/UI, Source Serif 4 for all
// h1-h4 (the product's visual signature), IBM Plex Mono for data (references,
// amounts, dates). Loaded via next/font/google (self-hosted, no render-blocking
// request) rather than the prototype's <link> tag — same fonts, no visual change.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif',
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
      className={`${ibmPlexSans.variable} ${sourceSerif4.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className={ibmPlexSans.className}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
        <InstallPrompt />
      </body>
    </html>
  );
}
