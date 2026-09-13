import type { Metadata } from 'next';
import { InvitationForm } from '@/components/admin-invite/InvitationForm';

// Token-scoped, single-invitee page — never indexed (same reasoning as
// /authentification-diplome/[token] and /corriger-ma-demande/[token]).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationForm token={token} />;
}
