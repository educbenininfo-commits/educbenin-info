'use client';

import { useState } from 'react';
import { SPECIALTIES, type Specialty } from '@/lib/specialties';

// DESIGN-SPEC.md section "4. Spécialités" + educbenin-prototype.html
// (#specGridFull / renderSpecGridFull). Accordion mechanism: a single
// `selectedCode` (one tile open at a time); the detail card is rendered as
// a sibling immediately after the clicked tile inside the same CSS grid
// (`grid-column:1/-1` spans it full-width), never in a separate panel —
// this is what makes it open "in place" regardless of the tile's position.

export function SpecialtyGrid() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  function toggle(code: string) {
    setSelectedCode((prev) => (prev === code ? null : code));
  }

  return (
    <div className="spec-grid">
      {SPECIALTIES.map((s) => (
        <SpecialtyTileAndDetail
          key={s.code}
          specialty={s}
          selected={s.code === selectedCode}
          onToggle={() => toggle(s.code)}
        />
      ))}
    </div>
  );
}

function SpecialtyTileAndDetail({
  specialty,
  selected,
  onToggle,
}: {
  specialty: Specialty;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div className={`spec-tile${selected ? ' sel' : ''}`} onClick={onToggle}>
        <div className="name">{specialty.name}</div>
        <div className="code">D.E.S. · {specialty.code}</div>
      </div>
      {selected && (
        <div className="spec-detail">
          <span className="badge-year">Année 2026–2027</span>
          <h3>{specialty.name}</h3>
          <dl className="kv">
            <dt>Date</dt>
            <dd>{specialty.date}</dd>
            <dt>Heure</dt>
            <dd>{specialty.heure}</dd>
            <dt>Salle</dt>
            <dd>{specialty.salle}</dd>
          </dl>
          <div className="wa-btn">
            <span className="ic">✆</span>
            <span>
              Communauté {specialty.name}
              <small>Groupe WhatsApp de la spécialité</small>
            </span>
          </div>
          <div className="wa-btn">
            <span className="ic">✆</span>
            <span>
              Communauté FSS<small>Tous candidats, toutes spécialités</small>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
