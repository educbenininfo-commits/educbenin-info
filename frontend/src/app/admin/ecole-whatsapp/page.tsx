// Écran back-office "École & WhatsApp" (renommé depuis "Spécialités &
// WhatsApp", prompt 11-backoffice-ecole-whatsapp.md) — filtre à deux
// niveaux (École puis Catégorie), lien WhatsApp général éditable, tableau
// des filières avec action "Modifier".
import { EcoleWhatsappList } from '@/components/backoffice/ecole-whatsapp/EcoleWhatsappList';

export default function EcoleWhatsappPage() {
  return <EcoleWhatsappList />;
}
