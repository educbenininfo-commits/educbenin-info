// frontend/src/app/admin/dossiers-rejetes/page.tsx
import { RejectedDossiersList } from '@/components/backoffice/dossiers/RejectedDossiersList';

export default function DossiersRejetesPage() {
  return (
    <>
      <h3 className="bo-h1">Dossiers rejetés</h3>
      <div className="bo-sub">Restaurables à tout moment vers « Dossiers reçus ».</div>
      <RejectedDossiersList />
    </>
  );
}
