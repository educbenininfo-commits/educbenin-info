import type { Metadata } from 'next';

// Server Component wrapper — auth/error/page.tsx (and any future /auth/*
// page) is 'use client'. These are OAuth failure/utility pages, not
// marketing content — never index them.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
