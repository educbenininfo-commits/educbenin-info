import type { Metadata } from 'next';

// Server Component wrapper — settings/page.tsx is 'use client'. Account
// settings are user-specific and behind auth; no reason to index them.
export const metadata: Metadata = {
  title: 'Paramètres du compte',
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
