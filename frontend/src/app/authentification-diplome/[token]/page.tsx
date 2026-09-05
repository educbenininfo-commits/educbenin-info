import { AuthDiplomeForm } from '@/components/auth-diplome/AuthDiplomeForm';

export default async function AuthentificationDiplomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AuthDiplomeForm token={token} />;
}
