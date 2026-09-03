'use client';

import { createContext, useContext } from 'react';

// Exposes the admin object the layout already fetched from GET /api/admin/me
// (for the auth gate) to descendant pages, so a page like /admin/parametres
// can show the real logged-in admin's email without a second fetch.

export type BackofficeAdmin = { id: string; email: string; role: 'ADMIN' | 'SUPERADMIN' };

const BackofficeAdminContext = createContext<BackofficeAdmin | null>(null);

export function BackofficeAdminProvider({
  admin,
  children,
}: {
  admin: BackofficeAdmin;
  children: React.ReactNode;
}) {
  return (
    <BackofficeAdminContext.Provider value={admin}>{children}</BackofficeAdminContext.Provider>
  );
}

export function useBackofficeAdmin(): BackofficeAdmin {
  const ctx = useContext(BackofficeAdminContext);
  if (!ctx) {
    throw new Error('useBackofficeAdmin must be used inside the /admin layout');
  }
  return ctx;
}
