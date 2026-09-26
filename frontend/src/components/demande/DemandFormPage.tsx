import type { ReactNode } from 'react';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { DisclaimerBar } from '@/components/public/DisclaimerBar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { CategoryDemandForm, type FiliereChoice } from '@/components/demande/CategoryDemandForm';

// Shared page shell for every per-category demand-form screen
// (06-demande-medecine-licence.md, 07-demande-master.md,
// 08-demande-inmes-c1.md, 09-demande-inmes-c2.md) — same structure in all
// four reference screenshots: eyebrow/title/lead, pièces-à-fournir card +
// info callout + tarif box side by side, then the step form. Only the
// content (pieces, callout, tarif, filière options) differs per page.
export function DemandFormPage({
  activeNav,
  ecoleNom,
  eyebrow,
  title,
  lead,
  piecesLegend,
  pieces,
  infoCallout,
  tarifDepart,
  tarifNote,
  categorieId,
  filiereOptions,
  filiereStepLabel,
  independenceSuffix,
  stepsSummary,
  contactLabel,
}: {
  activeNav: string;
  ecoleNom: string;
  eyebrow: string;
  title: string;
  lead: ReactNode;
  piecesLegend: ReactNode;
  pieces: ReactNode[];
  infoCallout?: ReactNode;
  tarifDepart: number | null;
  tarifNote: ReactNode;
  categorieId: string;
  filiereOptions: FiliereChoice[];
  filiereStepLabel?: string;
  independenceSuffix: string;
  stepsSummary: string;
  contactLabel: string;
}) {
  return (
    <div className="prod">
      <PublicNav active={activeNav} />
      <PublicBottomNav active={activeNav} />
      <DisclaimerBar ecoleNom={ecoleNom} />

      <div className="page-head pw">
        <div className="k">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{lead}</p>
      </div>

      <div className="section pw">
        <div className="two-col" style={{ alignItems: 'start' }}>
          <div className="doc-card">
            <h3>
              Pièces à fournir — mettre toutes les pièces dans un seul document PDF
              {piecesLegend && (
                <>
                  {' '}
                  — <em style={{ fontWeight: 400 }}>{piecesLegend}</em>
                </>
              )}
            </h3>
            <ol>
              {pieces.map((piece, i) => (
                <li key={i}>{piece}</li>
              ))}
            </ol>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {infoCallout && (
              <div className="callout info">
                <span className="icn">ⓘ</span>
                <span>{infoCallout}</span>
              </div>
            )}
            <div
              className="price-box"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}
            >
              <div style={{ fontSize: 12.5, color: 'var(--prod-ink-muted)' }}>À partir de</div>
              <div className="amt">
                {(tarifDepart ?? 0).toLocaleString('fr-FR')} <span className="cur">FCFA</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--prod-ink-faint)' }}>{tarifNote}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-bleed">
        <div className="section pw">
          <h2>Faire ma demande</h2>
          <p className="sub">{stepsSummary}</p>
          <CategoryDemandForm
            categorieId={categorieId}
            filiereOptions={filiereOptions}
            {...(filiereStepLabel ? { filiereStepLabel } : {})}
            independenceSuffix={independenceSuffix}
          />
        </div>
      </div>

      <PublicFooter currentEcoleNom={ecoleNom} contactLabel={contactLabel} />
    </div>
  );
}
