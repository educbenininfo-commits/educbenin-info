import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminLayoutClient } from './AdminLayoutClient';

// Server Component on purpose: `metadata.manifest` here overrides, for this
// segment and everything under it, the <link rel="manifest"> that Next.js
// auto-injects site-wide from the root app/manifest.ts special file. Next.js
// merges metadata per-route with the most specific segment winning on
// singular fields, and renders the result server-side — so every /admin/*
// page's initial HTML already points at /admin-manifest.webmanifest before
// any client JS runs. That's what makes "installer l'app" from inside the
// back-office open straight back into the back-office instead of the public
// homepage, without a client-side DOM-mutation race against the browser's
// install-prompt logic. Candidates installing from the public site are
// unaffected — they never render this segment.
//
// (app/admin/manifest.ts, the file-convention approach, does NOT work here —
// confirmed via build output showing no route generated for it and a live
// 404 on /admin/manifest.webmanifest: Next's special-file manifest handling
// is root-only, unlike this `metadata` field which does support per-segment
// overrides.)
export const metadata: Metadata = {
  manifest: '/admin-manifest.webmanifest',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
