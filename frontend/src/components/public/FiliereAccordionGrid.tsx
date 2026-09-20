'use client';

import { useState } from 'react';
import type { FiliereDetail } from '@/lib/server/schools/queries';

// Generalized version of the original SpecialtyGrid (which read the static
// SPECIALTIES array) — same accordion mechanism (single `selectedId`, the
// detail card renders as a full-width sibling right after the clicked
// tile), now reading real Filiere rows from the database. Used by the
// École — FSS page's "27 spécialités du D.E.S." section (moved here from
// the deleted /specialites page, per 03-ecole-fss.md — "strictement
// inchangé dans son fonctionnement, seulement déplacée").
export function FiliereAccordionGrid({
  filieres,
  ecoleWhatsappGeneral,
  ecoleNom,
  categorieLabel,
}: {
  filieres: FiliereDetail[];
  ecoleWhatsappGeneral: string | null;
  ecoleNom: string;
  categorieLabel: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function toggle(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="spec-grid">
      {filieres.map((f) => (
        <FiliereTileAndDetail
          key={f.id}
          filiere={f}
          selected={f.id === selectedId}
          onToggle={() => toggle(f.id)}
          ecoleWhatsappGeneral={ecoleWhatsappGeneral}
          ecoleNom={ecoleNom}
          categorieLabel={categorieLabel}
        />
      ))}
    </div>
  );
}

function FiliereTileAndDetail({
  filiere,
  selected,
  onToggle,
  ecoleWhatsappGeneral,
  ecoleNom,
  categorieLabel,
}: {
  filiere: FiliereDetail;
  selected: boolean;
  onToggle: () => void;
  ecoleWhatsappGeneral: string | null;
  ecoleNom: string;
  categorieLabel: string;
}) {
  return (
    <>
      <div className={`spec-tile${selected ? ' sel' : ''}`} onClick={onToggle}>
        <div>
          <div className="name">{filiere.nom}</div>
          <div className="code">
            {categorieLabel}
            {filiere.code ? ` · ${filiere.code}` : ''}
          </div>
        </div>
        <span className="chev">›</span>
      </div>
      {selected && (
        <div className="spec-detail">
          <span className="badge-year">Année 2026–2027</span>
          <h3>{filiere.nom}</h3>
          <dl className="kv">
            <dt>Date</dt>
            <dd>{filiere.date ?? 'À confirmer'}</dd>
            <dt>Heure</dt>
            <dd>{filiere.heure ?? 'À confirmer'}</dd>
            <dt>Salle</dt>
            <dd>{filiere.salle ?? 'À confirmer'}</dd>
          </dl>
          {filiere.lienWhatsapp && (
            <a
              href={filiere.lienWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-btn"
            >
              <span className="ic">✆</span>
              <span>
                Communauté {filiere.nom}
                <small>Groupe WhatsApp de la filière</small>
              </span>
            </a>
          )}
          {ecoleWhatsappGeneral && (
            <a
              href={ecoleWhatsappGeneral}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-btn"
            >
              <span className="ic">✆</span>
              <span>
                Communauté {ecoleNom}
                <small>Tous candidats, toutes filières</small>
              </span>
            </a>
          )}
        </div>
      )}
    </>
  );
}
