// Écran back-office "Tarifs" (13-backoffice-tarifs-personnalisables.md) —
// deux modes de tarification (Personnalisé par accompagnement / Tarif
// unique), une règle libre pour les spécialités D.E.S. additionnelles, et un
// historique des barèmes append-only (le plus récent = Actif, dérivé, jamais
// stocké — voir TarifBareme dans schema.prisma).
'use client';

import { TarifsList } from '@/components/backoffice/tarifs/TarifsList';

export default function TarifsPage() {
  return <TarifsList />;
}
