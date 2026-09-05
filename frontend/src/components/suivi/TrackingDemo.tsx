'use client';

import { useRef, useState } from 'react';
import { lookupDossier, uploadFiche, type LookupResult } from '@/lib/dossiers-public-api';

// DESIGN-SPEC.md section "3. Suivre mon dossier" + educbenin-prototype.html
// (#trackPick / #timeline / renderTimeline). The prototype's own demo state
// selector is gone — see Task 20 of
// docs/superpowers/plans/2026-09-03-dossiers-backend.md for why. Search now
// calls the real GET /api/dossiers/lookup route; the fiche transmission
// button (visible at stage 3) calls the real
// POST /api/dossiers/lookup/fiche route.

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
  const [refInput, setRefInput] = useState('');
  const [waInput, setWaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dossier, setDossier] = useState<LookupResult | null>(null);

  const [ficheFile, setFicheFile] = useState<File | null>(null);
  const [ficheSubmitting, setFicheSubmitting] = useState(false);
  const [ficheError, setFicheError] = useState<string | null>(null);
  const ficheInputRef = useRef<HTMLInputElement>(null);

  async function handleSearch() {
    setSearchError(null);
    if (!refInput.trim() || !waInput.trim()) {
      setSearchError('Renseignez votre référence de dossier et votre numéro WhatsApp.');
      return;
    }
    setLoading(true);
    try {
      const result = await lookupDossier(refInput.trim(), waInput.trim());
      if (!result.ok) {
        setDossier(null);
        setSearchError(
          'Aucun dossier trouvé pour ces informations. Vérifiez votre référence et votre numéro WhatsApp.',
        );
        return;
      }
      setDossier(result.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleFicheSubmit() {
    if (!ficheFile || !dossier) return;
    setFicheError(null);
    setFicheSubmitting(true);
    try {
      const form = new FormData();
      form.append('reference', refInput.trim());
      form.append('whatsapp', waInput.trim());
      form.append('file', ficheFile);
      await uploadFiche(form);
      setDossier({ ...dossier, ficheUploaded: true });
      setFicheFile(null);
    } catch {
      setFicheError('Impossible de transmettre votre fiche. Merci de réessayer.');
    } finally {
      setFicheSubmitting(false);
    }
  }

  const active = dossier?.stage ?? null;

  return (
    <>
      <div className="search-card">
        <div className="row2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Référence de dossier</label>
            <input
              placeholder="EB-202609-001"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Numéro WhatsApp</label>
            <input
              placeholder="+229 97 00 00 00"
              value={waInput}
              onChange={(e) => setWaInput(e.target.value)}
            />
          </div>
        </div>
        {searchError && (
          <p className="err-msg" style={{ marginTop: 10 }}>
            {searchError}
          </p>
        )}
        <button
          type="button"
          className={`btn btn-primary btn-block${loading ? ' is-disabled' : ''}`}
          style={{ marginTop: 14 }}
          disabled={loading}
          onClick={handleSearch}
        >
          {loading ? 'Recherche…' : 'Afficher mon dossier'}
        </button>
      </div>

      {active !== null && (
        <div className="timeline" style={{ marginTop: 18 }}>
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
                  Motif : {dossier?.motifRejet || 'aucun motif communiqué.'}
                </div>
                <div className="comment-note">
                  💬 Merci de nous transmettre les corrections nécessaires via WhatsApp.
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
                          Inscrivez-vous sur <strong>cuo.sigan-uac.bj</strong>, puis transmettez
                          votre fiche d&rsquo;inscription ci-dessous.
                        </div>
                        {dossier?.ficheUploaded ? (
                          <div className="comment-note" style={{ marginTop: 10 }}>
                            ✓ Fiche d&rsquo;inscription transmise.
                          </div>
                        ) : (
                          <>
                            <div
                              className="dropzone"
                              style={{ marginTop: 10 }}
                              onClick={() => ficheInputRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const dropped = e.dataTransfer.files[0];
                                if (dropped) setFicheFile(dropped);
                              }}
                            >
                              {ficheFile
                                ? ficheFile.name
                                : 'Glissez votre fiche d’inscription ici, ou cliquez pour parcourir'}
                            </div>
                            <input
                              ref={ficheInputRef}
                              type="file"
                              accept="application/pdf"
                              hidden
                              onChange={(e) => setFicheFile(e.target.files?.[0] ?? null)}
                            />
                            {ficheError && (
                              <p className="err-msg" style={{ marginTop: 6 }}>
                                {ficheError}
                              </p>
                            )}
                            <button
                              type="button"
                              className={`btn btn-primary btn-sm${!ficheFile || ficheSubmitting ? ' is-disabled' : ''}`}
                              disabled={!ficheFile || ficheSubmitting}
                              style={{ marginTop: 8 }}
                              onClick={handleFicheSubmit}
                            >
                              {ficheSubmitting
                                ? 'Envoi en cours…'
                                : "Transmettre ma fiche d'inscription"}
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {n === 5 && state === 'done' && (
                      <div className="cuo-note">
                        📄 Récépissé de dépôt FSS disponible —{' '}
                        {dossier?.recepisseUrl ? (
                          <a href={dossier.recepisseUrl} target="_blank" rel="noopener noreferrer">
                            <strong>télécharger le PDF</strong>
                          </a>
                        ) : (
                          <strong>en cours de mise à disposition</strong>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
