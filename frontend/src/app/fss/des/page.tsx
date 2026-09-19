// Écran "Dépôt du dossier de probatoire spécialité (D.E.S.)" — relocated
// from the old /accompagnement (which is now the Accompagnement hub, see
// 05-accompagnement-hub.md) to make room for it. Same DemandForm
// component, same tarif; "pièces à fournir" now read from
// Categorie.piecesAFournir (back-office-editable) instead of a hardcoded
// list, per the École & WhatsApp pièces-à-fournir customization request.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { DemandForm } from '@/components/accompagnement/DemandForm';
import { getCategorieById } from '@/lib/server/schools/queries';
import { CATEGORIE_FSS_DES_ID } from '@/lib/server/schools/reference-ids';

export const metadata: Metadata = {
  title: 'Dépôt du dossier de probatoire spécialité — D.E.S.',
  description:
    'Pièces à fournir, tarif, et formulaire de demande en 3 étapes pour votre dossier de probatoire spécialité FSS/UAC — spécialité, informations personnelles, pièces & envoi.',
  alternates: { canonical: '/fss/des' },
};

export default async function DemandeDesPage() {
  const categorie = await getCategorieById(CATEGORIE_FSS_DES_ID);
  if (!categorie) notFound();

  return (
    <div className="prod">
      <PublicNav active="ecole-fss" />
      <PublicBottomNav active="ecole-fss" />

      <div className="page-head pw">
        <div className="k">Accompagnement</div>
        <h1>Dépôt du dossier de probatoire spécialité</h1>
        <p>
          Nous rassemblons, vérifions et déposons votre dossier auprès de la FSS, et accompagnons
          l&rsquo;authentification de vos diplômes.
        </p>
      </div>

      <div className="section pw">
        <div className="two-col" style={{ alignItems: 'start' }}>
          <div className="doc-card">
            <h3>Pièces à fournir — un seul document PDF</h3>
            <ol>
              {categorie.piecesAFournir.map((piece, i) => (
                <li key={i}>{piece}</li>
              ))}
            </ol>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="callout warn">
              <span className="icn">⚠</span>
              <span>
                <strong>Plusieurs spécialités ?</strong> Les pièces 1 et 2 doivent être établies
                pour chaque spécialité demandée, sous peine de rejet du dossier.
              </span>
            </div>
            <div
              className="price-box"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}
            >
              <div style={{ fontSize: 12.5, color: 'var(--prod-ink-muted)' }}>À partir de</div>
              <div className="amt">
                {(categorie.tarifDepart ?? 0).toLocaleString('fr-FR')}{' '}
                <span className="cur">FCFA / spécialité</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--prod-ink-faint)' }}>
                Tarif multi-spécialités communiqué avant confirmation.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-bleed">
        <div className="section pw">
          <h2>Faire ma demande</h2>
          <p className="sub">3 étapes, environ 5 minutes.</p>
          <DemandForm />
        </div>
      </div>
    </div>
  );
}
