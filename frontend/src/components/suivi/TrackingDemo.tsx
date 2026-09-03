'use client';

import { useState } from 'react';

// DESIGN-SPEC.md section "3. Suivre mon dossier" + educbenin-prototype.html
// (#trackPick / #timeline / renderTimeline). The real search (référence +
// WhatsApp → dossier lookup) has no backend yet — per the prototype itself
// ("Aucune logique de recherche réelle n'est implémentée ... il faudra
// remplacer par la vraie logique de recherche"), the "Afficher mon dossier"
// button stays inert and the demo selector below drives the timeline,
// exactly as documented. Search fields use placeholders instead of the
// prototype's pre-filled example values — same "real blank form" principle
// applied to the Accompagnement form this session.

const STAGES: { t: string; d: string }[] = [
  {
    t: 'Dossier en cours de traitement',
    d: 'Vos pièces sont en cours de vérification par notre équipe.',
  },
  {
    t: 'Authentification du diplôme en cours',
    d: "Un lien vous a été envoyé par WhatsApp pour remplir le formulaire d'authentification.",
  },
  {
    t: 'Inscription en ligne',
    d: "Inscrivez-vous sur cuo.sigan-uac.bj puis transmettez votre fiche d'inscription ci-dessous.",
  },
  {
    t: 'Dépôt de dossier en cours',
    d: 'Votre dossier complet est en cours de dépôt auprès de la FSS.',
  },
  {
    t: 'Dossier déposé avec succès',
    d: 'Votre récépissé officiel est disponible au téléchargement.',
  },
];

const TRACK_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1 · En cours' },
  { value: 2, label: '2 · Authentification' },
  { value: 3, label: '3 · Inscription en ligne' },
  { value: 4, label: '4 · Dépôt en cours' },
  { value: 5, label: '5 · Déposé' },
  { value: 0, label: 'Rejeté' },
];

function stateOf(stageNum: number, active: number): 'done' | 'now' | 'next' {
  if (stageNum < active) return 'done';
  if (stageNum === active) return 'now';
  return 'next';
}

const STATE_LABEL: Record<'done' | 'now' | 'next', string> = {
  done: 'Terminé',
  now: 'En cours',
  next: 'À venir',
};

export function TrackingDemo() {
  const [active, setActive] = useState(2);

  return (
    <>
      <div className="search-card">
        <div className="row2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Référence de dossier</label>
            <input placeholder="EB-2026-000482" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Numéro WhatsApp</label>
            <input placeholder="+229 97 00 00 00" />
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
          Afficher mon dossier
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--prod-ink-faint)' }}>
        Aperçu des différentes étapes possibles :
      </div>
      <div className="track-pick">
        {TRACK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={active === opt.value ? 'on' : ''}
            onClick={() => setActive(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="timeline">
        {active === 0 ? (
          <div className="tl-row">
            <div className="tl-node">
              <div
                className="tl-dot"
                style={{ background: 'var(--prod-danger)', borderColor: 'var(--prod-danger)' }}
              />
            </div>
            <div className="tl-body">
              <div className="tl-title">
                Dossier rejeté <span className="st danger">À corriger</span>
              </div>
              <div className="tl-desc">
                Motif : les pièces 1 et 2 n&rsquo;ont pas été fournies pour chacune des 2
                spécialités demandées.
              </div>
              <div className="comment-note">
                💬 Merci de renvoyer une demande et une lettre distinctes pour chaque spécialité,
                puis de nous les transmettre via WhatsApp.
              </div>
            </div>
          </div>
        ) : (
          STAGES.map((stage, i) => {
            const n = i + 1;
            const state = stateOf(n, active);
            return (
              <div key={stage.t} className="tl-row">
                <div className="tl-node">
                  <div
                    className={`tl-dot${state === 'done' ? ' done' : state === 'now' ? ' now' : ''}`}
                  />
                  {i < STAGES.length - 1 && (
                    <div className={`tl-line${state === 'done' ? ' done' : ''}`} />
                  )}
                </div>
                <div className="tl-body">
                  <div className="tl-title">
                    {stage.t}
                    <span className={`st ${state}`}>{STATE_LABEL[state]}</span>
                  </div>
                  <div className="tl-desc">{stage.d}</div>
                  {n === 2 && state === 'now' && (
                    <div className="comment-note">
                      💬 Consultez votre WhatsApp : le formulaire d&rsquo;authentification de
                      diplôme vous attend.
                    </div>
                  )}
                  {n === 3 && state === 'now' && (
                    <>
                      <div className="cuo-note">
                        Inscrivez-vous sur <strong>cuo.sigan-uac.bj</strong>, puis transmettez votre
                        fiche d&rsquo;inscription ci-dessous.
                      </div>
                      <div className="dropzone" style={{ marginTop: 10 }}>
                        Glissez votre fiche d&rsquo;inscription ici, ou cliquez pour parcourir
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: 8 }}
                      >
                        Transmettre ma fiche d&rsquo;inscription
                      </button>
                    </>
                  )}
                  {n === 5 && state === 'done' && (
                    <div className="cuo-note">
                      📄 Récépissé de dépôt FSS disponible — <strong>télécharger le PDF</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
