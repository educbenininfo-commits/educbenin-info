'use client';

// D.E.S. specialties on the École — FSS page: every card shows its date,
// time, room and WhatsApp community directly (no click-to-open accordion),
// with a search bar filtering by name or code. The école-wide WhatsApp
// community is shown once above the grid instead of on every card.
import { useState } from 'react';
import { CalendarDays, Clock, DoorOpen, MessageCircle, Search, Users } from 'lucide-react';
import type { FiliereDetail } from '@/lib/server/schools/queries';

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function FiliereCardGrid({
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
  const [q, setQ] = useState('');
  const needle = normalize(q.trim());
  const visible = needle
    ? filieres.filter((f) => normalize(`${f.nom} ${f.code ?? ''}`).includes(needle))
    : filieres;

  return (
    <>
      <div className="fil-toolbar">
        <label className="fil-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Rechercher une spécialité</span>
          <input
            type="search"
            placeholder="Rechercher une spécialité (ex. Cardiologie, CAR)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        {ecoleWhatsappGeneral && (
          <a
            href={ecoleWhatsappGeneral}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-btn fil-general"
          >
            <span className="ic">
              <Users size={18} />
            </span>
            <span>
              Communauté {ecoleNom}
              <small>Tous candidats, toutes filières</small>
            </span>
          </a>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="tile">
            <Search size={20} />
          </div>
          <strong>Aucune spécialité trouvée</strong>
          Essayez un autre nom ou un code à 3 lettres.
        </div>
      ) : (
        <div className="fil-grid">
          {visible.map((f) => (
            <article key={f.id} className="fil-card">
              <header>
                <h3>{f.nom}</h3>
                <span className="fil-code">
                  {categorieLabel}
                  {f.code ? ` · ${f.code}` : ''}
                </span>
              </header>
              <dl className="fil-meta">
                <div>
                  <dt>
                    <CalendarDays size={15} aria-hidden="true" /> Date
                  </dt>
                  <dd className={f.date ? '' : 'tbc'}>{f.date ?? 'À confirmer'}</dd>
                </div>
                <div>
                  <dt>
                    <Clock size={15} aria-hidden="true" /> Heure
                  </dt>
                  <dd className={f.heure ? '' : 'tbc'}>{f.heure ?? 'À confirmer'}</dd>
                </div>
                <div>
                  <dt>
                    <DoorOpen size={15} aria-hidden="true" /> Salle
                  </dt>
                  <dd className={f.salle ? '' : 'tbc'}>{f.salle ?? 'À confirmer'}</dd>
                </div>
              </dl>
              {f.lienWhatsapp ? (
                <a
                  href={f.lienWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fil-wa"
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  Rejoindre la communauté WhatsApp
                </a>
              ) : (
                <span className="fil-wa off">Groupe WhatsApp bientôt disponible</span>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
