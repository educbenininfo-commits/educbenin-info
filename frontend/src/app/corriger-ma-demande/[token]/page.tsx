import type { Metadata } from 'next';
import { CorrectionForm } from '@/components/correction/CorrectionForm';

// Token-scoped, single-candidate page — never indexed (same reasoning as
// /authentification-diplome/[token]).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CorrigerMaDemandePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CorrectionForm token={token} />;
}
