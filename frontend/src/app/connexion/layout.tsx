import type { Metadata } from 'next';

// Server Component wrapper — connexion/page.tsx is 'use client' (can't export
// metadata itself). Admin login must never be indexed: it's not marketing
// content, and surfacing it in search results would just help credential
// stuffing attempts find it.
export const metadata: Metadata = {
  title: 'Connexion',
  robots: { index: false, follow: false },
};

export default function ConnexionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
