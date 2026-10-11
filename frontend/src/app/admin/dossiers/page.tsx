// Écran Dossiers — en-tête, période, cadrans KPI et liste : tout vit dans
// DossiersList (client component), qui partage un seul état de filtres.
import { DossiersList } from '@/components/backoffice/dossiers/DossiersList';

export default function DossiersPage() {
  return <DossiersList />;
}
