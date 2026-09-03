'use client';

import { useState } from 'react';
import { STAGE_NAMES, fmtF, pillClass, type Dossier } from '@/lib/dossiers-data';

// #dossierOverlay / openModal / authButtonState / ficheButtonState /
// recepisseButtonState / showConfirm — DESIGN-SPEC.md section "10. Dossiers".
// Rendered with `key={dossier.ref}` by the parent so every re-open remounts
// with fresh state — same effect as the prototype's openModal() resetting
// tabs/previews/confirm box each time.
//
// One deliberate deviation, flagged by the doc itself as needed for the real
// product: the rejection motif is now captured onto the dossier instead of
// being read and discarded — there's still no backend to persist it beyond
// this session's in-memory state, but at least it survives to the Dossiers
// rejetés-equivalent view instead of vanishing.

type AuthButtonState = { enabled: boolean; label: string; title: string };
type FicheButtonState = { enabled: boolean; title: string };
type RecepisseButtonState = { enabled: boolean; label: string; title: string };

function authButtonState(d: Dossier): AuthButtonState {
  if (d.stage !== 2) {
    return {
      enabled: false,
      label: d.stage > 2 ? 'Authentification déjà traitée' : "Formulaire d'authentification",
      title:
        d.stage > 2
          ? 'Cette étape est déjà terminée pour ce dossier.'
          : 'Disponible une fois le dossier à l’étape « Authentification du diplôme en cours ».',
    };
  }
  if (!d.authSent) {
    return {
      enabled: true,
      label: "Envoyer le formulaire d'authentification",
      title: 'Envoie le lien du formulaire par WhatsApp au candidat.',
    };
  }
  if (d.authSent && !d.authSubmitted) {
    return {
      enabled: false,
      label: 'En attente du candidat',
      title: 'Le formulaire a été envoyé ; en attente de soumission par le candidat.',
    };
  }
  return {
    enabled: true,
    label: "Voir le formulaire d'authentification",
    title: 'Afficher les informations soumises par le candidat.',
  };
}

function ficheButtonState(d: Dossier): FicheButtonState {
  if (d.stage !== 3) {
    return {
      enabled: false,
      title:
        d.stage > 3
          ? 'Cette étape est déjà terminée pour ce dossier.'
          : 'Disponible à l’étape « Inscription en ligne ».',
    };
  }
  if (!d.ficheUploaded) {
    return {
      enabled: false,
      title: 'En attente de transmission par le candidat depuis sa page de suivi.',
    };
  }
  return { enabled: true, title: "Afficher la fiche d'inscription transmise par le candidat." };
}

function recepisseButtonState(d: Dossier): RecepisseButtonState {
  if (d.stage === 4) {
    return {
      enabled: true,
      label: 'Ajouter le récépissé (scan FSS)',
      title: 'Uploader le scan du récépissé remis par la FSS au moment du dépôt.',
    };
  }
  if (d.stage === 5 && d.recepisseUploaded) {
    return {
      enabled: true,
      label: 'Voir le récépissé',
      title: 'Afficher le récépissé transmis au candidat.',
    };
  }
  return {
    enabled: false,
    label: 'Récépissé de dépôt',
    title: 'Disponible à partir de l’étape « Dépôt de dossier en cours ».',
  };
}

function KvList({ pairs }: { pairs: [string, string | undefined][] }) {
  return (
    <dl>
      {pairs.map(([label, value]) => (
        <div key={label} style={{ display: 'contents' }}>
          <dt>{label}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

type ConfirmState =
  | { kind: 'avancer' }
  | { kind: 'restaurer' }
  | { kind: 'rejeter'; motif: string }
  | null;

export function DossierModal({
  dossier,
  onClose,
  onUpdate,
}: {
  dossier: Dossier;
  onClose: () => void;
  onUpdate: (next: Dossier) => void;
}) {
  const [tab, setTab] = useState<'pay' | 'pub' | 'int'>('pay');
  const [authPreviewOpen, setAuthPreviewOpen] = useState(false);
  const [fichePreviewOpen, setFichePreviewOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const auth = authButtonState(dossier);
  const fiche = ficheButtonState(dossier);
  const recepisse = recepisseButtonState(dossier);
  const canReject = dossier.stage >= 1 && dossier.stage <= 4;
  const canRestore = dossier.stage === 0;
  const canAdvance = dossier.stage >= 1 && dossier.stage <= 4;
  const reste = Math.max(dossier.montant - dossier.paye, 0);
  const fileName = `dossier-${dossier.name.split(' ').pop()!.toLowerCase()}.pdf`;

  function handleAuthClick() {
    if (!auth.enabled) return;
    if (!dossier.authSent) {
      onUpdate({ ...dossier, authSent: true });
      return;
    }
    setAuthPreviewOpen((v) => !v);
  }

  function handlePayeChange(raw: string) {
    const parsed = parseInt(raw || '0', 10);
    const clamped = Math.max(0, Math.min(Number.isNaN(parsed) ? 0 : parsed, dossier.montant));
    onUpdate({ ...dossier, paye: clamped });
  }

  function confirmAdvance() {
    onUpdate({ ...dossier, stage: Math.min(dossier.stage + 1, 5) as Dossier['stage'] });
    setConfirm(null);
  }
  function confirmRestore() {
    onUpdate({ ...dossier, stage: 1 });
    setConfirm(null);
  }
  function confirmReject() {
    if (confirm?.kind !== 'rejeter') return;
    onUpdate({ ...dossier, stage: 0, motif: confirm.motif });
    setConfirm(null);
  }

  return (
    <div
      className="overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3>{dossier.name}</h3>
            <div
              style={{ fontSize: 12, color: 'var(--prod-ink-faint)', marginTop: 3 }}
              className="mono"
            >
              {dossier.ref} · {dossier.spec}
            </div>
          </div>
          <button type="button" className="x" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="row2">
            <div>
              <div className="hint" style={{ marginBottom: 3 }}>
                Numéro WhatsApp
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{dossier.wa}</div>
            </div>
            <div>
              <div className="hint" style={{ marginBottom: 3 }}>
                Étape actuelle
              </div>
              <span className={`pill ${pillClass(dossier.stage)}`}>
                {STAGE_NAMES[dossier.stage]}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="hint" style={{ marginBottom: 8 }}>
              Pièces jointes
            </div>
            <div className="file-row">
              <span className="n">📎 {fileName}</span>
              <span className="hint">4,8 Mo</span>
            </div>
            <div className="actions-grid">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                title="Corriger une information saisie par le candidat."
              >
                Modifier
              </button>
              <button
                type="button"
                className={`btn btn-outline btn-sm${auth.enabled ? '' : ' is-disabled'}`}
                disabled={!auth.enabled}
                title={auth.title}
                onClick={handleAuthClick}
              >
                {auth.label}
              </button>
              <button
                type="button"
                className={`btn btn-outline btn-sm${fiche.enabled ? '' : ' is-disabled'}`}
                disabled={!fiche.enabled}
                title={fiche.title}
                onClick={() => fiche.enabled && setFichePreviewOpen((v) => !v)}
              >
                Voir la fiche d&rsquo;inscription
              </button>
              <button
                type="button"
                className={`btn btn-outline btn-sm${recepisse.enabled ? '' : ' is-disabled'}`}
                disabled={!recepisse.enabled}
                title={recepisse.title}
              >
                {recepisse.label}
              </button>
            </div>

            <div className={`preview-box${authPreviewOpen ? ' show' : ''}`}>
              <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 2 }}>
                Formulaire d&rsquo;authentification de diplôme — réponses soumises
              </div>
              <dl>
                <dt>N° de dossier (pré-rempli)</dt>
                <dd className="dd-readonly">{dossier.ref}</dd>
              </dl>
              {dossier.authForm ? (
                <>
                  <div
                    className="hint"
                    style={{
                      margin: '12px 0 4px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      fontSize: 10.5,
                    }}
                  >
                    Informations personnelles
                  </div>
                  <KvList
                    pairs={[
                      ['Nom', dossier.authForm.nom],
                      ['Prénom(s)', dossier.authForm.prenom],
                      ['Date de naissance', dossier.authForm.naissance],
                      ['Lieu de naissance', dossier.authForm.lieuNaissance],
                      ['Nationalité', dossier.authForm.nationalite],
                      ['Adresse actuelle', dossier.authForm.adresse],
                      [
                        "Pièce d'identité",
                        `${dossier.authForm.piece} · ${dossier.authForm.pieceRef}`,
                      ],
                      ['E-mail', dossier.authForm.email],
                      ['Téléphone', dossier.authForm.tel],
                    ]}
                  />
                  <div
                    className="hint"
                    style={{
                      margin: '12px 0 4px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      fontSize: 10.5,
                    }}
                  >
                    Diplôme du Baccalauréat
                  </div>
                  <KvList
                    pairs={[
                      ['Institution', dossier.authForm.bac.institution],
                      ['E-mail institution', dossier.authForm.bac.email],
                      ["Année d'obtention", dossier.authForm.bac.annee],
                      ["Pays d'obtention", dossier.authForm.bac.pays],
                      ['Adresse institution', dossier.authForm.bac.adresse],
                    ]}
                  />
                  <div
                    className="hint"
                    style={{
                      margin: '12px 0 4px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      fontSize: 10.5,
                    }}
                  >
                    Diplôme du Doctorat
                  </div>
                  <KvList
                    pairs={[
                      ['Institution', dossier.authForm.doctorat.institution],
                      ['E-mail institution', dossier.authForm.doctorat.email],
                      ["Année d'obtention", dossier.authForm.doctorat.annee],
                      ["Pays d'obtention", dossier.authForm.doctorat.pays],
                      ['Adresse institution', dossier.authForm.doctorat.adresse],
                    ]}
                  />
                </>
              ) : (
                <dl>
                  <dt>—</dt>
                  <dd>Formulaire non encore soumis par le candidat.</dd>
                </dl>
              )}
            </div>

            <div className={`preview-box${fichePreviewOpen ? ' show' : ''}`}>
              <div className="file-row" style={{ marginBottom: 0 }}>
                <span className="n">📎 fiche-inscription-cuo.pdf</span>
                <span className="hint">1,1 Mo</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="tabbtns">
              <button
                type="button"
                className={tab === 'pay' ? 'on' : ''}
                onClick={() => setTab('pay')}
              >
                Paiement
              </button>
              <button
                type="button"
                className={tab === 'pub' ? 'on' : ''}
                onClick={() => setTab('pub')}
              >
                Commentaires publics
              </button>
              <button
                type="button"
                className={tab === 'int' ? 'on' : ''}
                onClick={() => setTab('int')}
              >
                Commentaires internes
              </button>
            </div>

            {tab === 'pay' && (
              <div className="tabpane on">
                <div className="hint" style={{ marginBottom: 10 }}>
                  Champs internes — jamais visibles par le candidat.
                </div>
                <div className="pay-field-row">
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Montant du dossier</label>
                    <input className="mono" readOnly value={fmtF(dossier.montant)} />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Payé</label>
                    <input
                      className="mono"
                      type="number"
                      step={1000}
                      value={dossier.paye}
                      onChange={(e) => handlePayeChange(e.target.value)}
                    />
                  </div>
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label>Moyen de paiement</label>
                  <select
                    value={dossier.moyen}
                    onChange={(e) =>
                      onUpdate({ ...dossier, moyen: e.target.value as Dossier['moyen'] })
                    }
                  >
                    <option>Non renseigné</option>
                    <option>Mobile Money</option>
                    <option>Espèces</option>
                    <option>Virement</option>
                  </select>
                </div>
                <div className={`pay-summary ${reste > 0 ? 'due' : 'clear'}`}>
                  <span>Reste à payer</span>
                  <span className="v">{fmtF(reste)}</span>
                </div>
              </div>
            )}
            {tab === 'pub' && (
              <div className="tabpane on">
                <div className="bubble pub">
                  Merci de vérifier l&rsquo;orthographe de votre nom sur la pièce n°5.
                  <div className="meta">Chimène A. · il y a 2 j</div>
                </div>
                <textarea
                  placeholder="Ajouter un commentaire visible par le candidat…"
                  style={{
                    width: '100%',
                    border: '1px solid var(--prod-border)',
                    borderRadius: 9,
                    padding: 10,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    minHeight: 60,
                  }}
                />
              </div>
            )}
            {tab === 'int' && (
              <div className="tabpane on">
                <div className="bubble int">
                  🔒 Interne — diplôme de Doctorat difficile à lire, à confirmer avec le candidat
                  avant envoi APDP.
                  <div className="meta">Chimène A. · il y a 1 j</div>
                </div>
                <textarea
                  placeholder="Ajouter une note interne (non visible du candidat)…"
                  style={{
                    width: '100%',
                    border: '1px solid var(--prod-border)',
                    borderRadius: 9,
                    padding: 10,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    minHeight: 60,
                  }}
                />
              </div>
            )}
          </div>

          {confirm && (
            <div className="confirm-inline show">
              {confirm.kind === 'avancer' && (
                <>
                  Confirmer le passage de <strong>« {STAGE_NAMES[dossier.stage]} »</strong> à{' '}
                  <strong>« {STAGE_NAMES[Math.min(dossier.stage + 1, 5)]} »</strong> ?
                  <div className="go">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={confirmAdvance}
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setConfirm(null)}
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
              {confirm.kind === 'restaurer' && (
                <>
                  Restaurer ce dossier vers <strong>« Dossier en cours de traitement »</strong> ?
                  <div className="go">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={confirmRestore}
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setConfirm(null)}
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
              {confirm.kind === 'rejeter' && (
                <>
                  Motif du rejet (visible par le candidat) :
                  <textarea
                    placeholder="Ex. pièces 1 et 2 non dupliquées par spécialité…"
                    value={confirm.motif}
                    onChange={(e) => setConfirm({ kind: 'rejeter', motif: e.target.value })}
                  />
                  <div className="go">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={confirmReject}
                    >
                      Rejeter le dossier
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setConfirm(null)}
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button
            type="button"
            className={`btn btn-danger-outline btn-sm${canReject ? '' : ' is-disabled'}`}
            disabled={!canReject}
            title={
              dossier.stage === 0
                ? 'Ce dossier est déjà rejeté.'
                : dossier.stage === 5
                  ? 'Un dossier déposé avec succès ne peut plus être rejeté.'
                  : 'Rejeter ce dossier vers « Dossiers rejetés ».'
            }
            onClick={() => canReject && setConfirm({ kind: 'rejeter', motif: '' })}
          >
            Rejeter le dossier
          </button>
          <button
            type="button"
            className={`btn btn-outline btn-sm${canRestore ? '' : ' is-disabled'}`}
            disabled={!canRestore}
            title={
              dossier.stage === 0
                ? 'Remet ce dossier dans le circuit normal.'
                : 'Disponible uniquement pour un dossier rejeté.'
            }
            onClick={() => canRestore && setConfirm({ kind: 'restaurer' })}
          >
            Restaurer vers Dossiers reçus
          </button>
          <button
            type="button"
            className={`btn btn-primary btn-sm${canAdvance ? '' : ' is-disabled'}`}
            disabled={!canAdvance}
            title={
              dossier.stage === 5
                ? 'Ce dossier est déjà finalisé.'
                : dossier.stage === 0
                  ? 'Restaurez le dossier avant de le faire progresser.'
                  : 'Fait passer le dossier à l’étape suivante.'
            }
            onClick={() => canAdvance && setConfirm({ kind: 'avancer' })}
          >
            {dossier.stage === 5 ? 'Dossier finalisé ✓' : 'Faire passer à l’étape suivante →'}
          </button>
        </div>
      </div>
    </div>
  );
}
