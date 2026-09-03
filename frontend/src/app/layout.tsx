import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';

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

export const metadata: Metadata = {
  title: 'Educ Bénin',
  description:
    "Accompagnement du dossier de probatoire spécialité — FSS / UAC. Service indépendant, sans affiliation avec la FSS ni l'UAC.",
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
    >
      <body className={ibmPlexSans.className}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
