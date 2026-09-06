import type { Metadata } from 'next';
import { AuthDiplomeForm } from '@/components/auth-diplome/AuthDiplomeForm';

// Token-scoped, single-candidate page — must never be indexed: the token in
// the URL grants access to submit a candidate's diploma-authentication
// form, so surfacing it in search results would be a real privacy/security
// leak, not just noise.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthentificationDiplomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AuthDiplomeForm token={token} />;
}
