// frontend/src/components/backoffice/dossiers/DossierModal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { invalidateCachePrefix } from '@/lib/useApi';
import {
  STAGE_NAMES,
  fmtF,
  pillClass,
  displayName,
  formatRelativeTime,
  formatDateTime,
  type DossierDetail,
} from '@/lib/dossiers-data';
import {
  fetchDossierDetail,
  updateDossierPayment,
  sendAuthForm,
  rejectDossier,
  restoreDossier,
  advanceDossier,
  addDossierComment,
  uploadRecepisse,
} from '@/lib/dossiers-admin-api';

// #dossierOverlay / openModal / authButtonState / ficheButtonState /
// recepisseButtonState / showConfirm — DESIGN-SPEC.md section "10. Dossiers".
// Now backed by real data: the modal fetches its own detail by `id` on open
// (rendered with `key={id}` by the parent, so every re-open remounts fresh —
// same effect as the prototype's openModal() resetting tabs/previews/confirm
// each time) and every action calls the real admin route instead of mutating
// local state. See Task 22 of
// docs/superpowers/plans/2026-09-03-dossiers-backend.md for the 3 behavioral
// gaps this filled in (payment save-on-blur, comment submit buttons, file
// row sizes).

type AuthButtonState = { enabled: boolean; label: string; title: string };
type FicheButtonState = { enabled: boolean; title: string };
type RecepisseButtonState = {
  enabled: boolean;
  label: string;
  title: string;
  mode: 'add' | 'view' | 'none';
};

function authButtonState(d: DossierDetail): AuthButtonState {
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
  if (!d.authSentAt) {
    return {
      enabled: true,
      label: "Envoyer le formulaire d'authentification",
      title: 'Envoie le lien du formulaire par WhatsApp au candidat.',
    };
  }
  if (d.authSentAt && !d.authSubmittedAt) {
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

function ficheButtonState(d: DossierDetail): FicheButtonState {
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

function recepisseButtonState(d: DossierDetail): RecepisseButtonState {
  if (d.stage === 4) {
    return {
      enabled: true,
      label: 'Ajouter le récépissé (scan FSS)',
      title: 'Uploader le scan du récépissé remis par la FSS au moment du dépôt.',
      mode: 'add',
    };
  }
  if (d.stage === 5 && d.recepisseUploaded) {
    return {
      enabled: true,
      label: 'Voir le récépissé',
      title: 'Afficher le récépissé transmis au candidat.',
      mode: 'view',
    };
  }
  return {
    enabled: false,
    label: 'Récépissé de dépôt',
    title: 'Disponible à partir de l’étape « Dépôt de dossier en cours ».',
    mode: 'none',
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
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [dossier, setDossier] = useState<DossierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pay' | 'pub' | 'int'>('pay');
  const [authPreviewOpen, setAuthPreviewOpen] = useState(false);
  const [fichePreviewOpen, setFichePreviewOpen] = useState(false);
  const [recepissePreviewOpen, setRecepissePreviewOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [payeInput, setPayeInput] = useState('0');
  const [publicComment, setPublicComment] = useState('');
  const [internalComment, setInternalComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const recepisseInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchDossierDetail(id);
      setDossier(res.dossier);
      setPayeInput(String(res.dossier.paye));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Only `id` should re-trigger the fetch; `load` is stable in behavior.
    // (No react-hooks/exhaustive-deps plugin is configured in this repo's
    // eslint.config.mjs, so no disable directive is needed here.)
  }, [id]);

  if (loading || !dossier) {
    return (
      <div className="overlay show">
        <div className="modal">
          <div className="modal-body" style={{ padding: 40, textAlign: 'center' }}>
            <span style={{ color: 'var(--prod-ink-muted)', fontSize: 13.5 }}>Chargement…</span>
          </div>
        </div>
      </div>
    );
  }

  const auth = authButtonState(dossier);
  const fiche = ficheButtonState(dossier);
  const recepisse = recepisseButtonState(dossier);
  const canReject = dossier.stage >= 1 && dossier.stage <= 4;
  const canRestore = dossier.stage === 0;
  const canAdvance = dossier.stage >= 1 && dossier.stage <= 4;
  const totalDue = dossier.montant + (dossier.montantSupplement ?? 0);
  const reste = Math.max(totalDue - dossier.paye, 0);

  async function handleAuthClick() {
    if (!auth.enabled || !dossier) return;
    if (!dossier.authSentAt) {
      setActionError(null);
      setActionLoading(true);
      try {
        const res = await sendAuthForm(dossier.id);
        const url = `${window.location.origin}/authentification-diplome/${res.token}`;
        const message = `Bonjour, votre dossier ${dossier.reference} est en cours de traitement chez Educ Bénin. Merci de compléter le formulaire d'authentification de votre diplôme via ce lien : ${url}`;
        const digits = dossier.whatsapp.replace(/\D/g, '');
        window.open(
          `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
          '_blank',
          'noopener,noreferrer',
        );
        await load();
        onChanged();
      } catch {
        setActionError("Impossible d'envoyer le formulaire d'authentification.");
      } finally {
        setActionLoading(false);
      }
      return;
    }
    setAuthPreviewOpen((v) => !v);
  }

  async function commitPaye() {
    if (!dossier) return;
    const parsed = parseInt(payeInput || '0', 10);
    const value = Number.isNaN(parsed) ? 0 : parsed;
    if (value === dossier.paye) return;
    try {
      const res = await updateDossierPayment(dossier.id, { paye: value });
      setDossier(res.dossier);
      setPayeInput(String(res.dossier.paye));
    } catch {
      setActionError('Impossible de mettre à jour le montant payé.');
      setPayeInput(String(dossier.paye));
    }
  }

  async function handleMoyenChange(moyen: string) {
    if (!dossier) return;
    try {
      const res = await updateDossierPayment(dossier.id, { moyen });
      setDossier(res.dossier);
    } catch {
      setActionError('Impossible de mettre à jour le moyen de paiement.');
    }
  }

  async function submitComment(type: 'public' | 'internal') {
    if (!dossier) return;
    const text = type === 'public' ? publicComment.trim() : internalComment.trim();
    if (!text) return;
    setCommentSubmitting(true);
    try {
      await addDossierComment(dossier.id, type, text);
      if (type === 'public') setPublicComment('');
      else setInternalComment('');
      await load();
    } catch {
      setActionError('Impossible de publier ce commentaire.');
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleRecepisseFile(file: File | null) {
    if (!file || !dossier) return;
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await uploadRecepisse(dossier.id, file);
      setDossier(res.dossier);
      onChanged();
    } catch {
      setActionError('Impossible de transmettre le récépissé.');
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmAdvance() {
    if (!dossier) return;
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await advanceDossier(dossier.id);
      setDossier(res.dossier);
      invalidateCachePrefix('/api/admin/dossiers');
      onChanged();
      setConfirm(null);
    } catch {
      setActionError('Impossible de faire progresser ce dossier.');
    } finally {
      setActionLoading(false);
    }
  }
  async function confirmRestore() {
    if (!dossier) return;
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await restoreDossier(dossier.id);
      setDossier(res.dossier);
      invalidateCachePrefix('/api/admin/dossiers');
      onChanged();
      setConfirm(null);
    } catch {
      setActionError('Impossible de restaurer ce dossier.');
    } finally {
      setActionLoading(false);
    }
  }
  async function confirmReject() {
    if (!dossier || confirm?.kind !== 'rejeter') return;
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await rejectDossier(dossier.id, confirm.motif);
      setDossier(res.dossier);
      invalidateCachePrefix('/api/admin/dossiers');
      onChanged();
      setConfirm(null);
    } catch {
      setActionError('Impossible de rejeter ce dossier.');
    } finally {
      setActionLoading(false);
    }
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
            <h3>{displayName(dossier.nom, dossier.prenom)}</h3>
            <div
              style={{ fontSize: 12, color: 'var(--prod-ink-faint)', marginTop: 3 }}
              className="mono"
            >
              {dossier.reference}
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
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{dossier.whatsapp}</div>
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

          {actionError && (
            <p className="err-msg" style={{ marginTop: 12 }}>
              {actionError}
            </p>
          )}

          <div style={{ marginTop: 18 }}>
            <div className="hint" style={{ marginBottom: 8 }}>
              Pièces jointes
            </div>
            <div className="file-row">
              {dossier.pieceJointeUrl ? (
                <a
                  className="n"
                  href={dossier.pieceJointeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📎 dossier-{dossier.reference}.pdf
                </a>
              ) : (
                <span className="n" style={{ color: 'var(--prod-ink-faint)' }}>
                  📎 Aucune pièce jointe
                </span>
              )}
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
                disabled={!auth.enabled || actionLoading}
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
                disabled={!recepisse.enabled || actionLoading}
                title={recepisse.title}
                onClick={() =>
                  recepisse.mode === 'add'
                    ? recepisseInputRef.current?.click()
                    : recepisse.mode === 'view'
                      ? setRecepissePreviewOpen((v) => !v)
                      : undefined
                }
              >
                {recepisse.label}
              </button>
              <input
                ref={recepisseInputRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => handleRecepisseFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className={`preview-box${authPreviewOpen ? ' show' : ''}`}>
              <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 2 }}>
                Formulaire d&rsquo;authentification de diplôme — réponses soumises
              </div>
              <dl>
                <dt>N° de dossier (pré-rempli)</dt>
                <dd className="dd-readonly">{dossier.reference}</dd>
              </dl>
              {dossier.authFormData ? (
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
                      ['Nom', dossier.authFormData.nom],
                      ['Prénom(s)', dossier.authFormData.prenom],
                      ['Date de naissance', dossier.authFormData.naissance],
                      ['Lieu de naissance', dossier.authFormData.lieuNaissance],
                      ['Nationalité', dossier.authFormData.nationalite],
                      ['Adresse actuelle', dossier.authFormData.adresse],
                      [
                        "Pièce d'identité",
                        `${dossier.authFormData.piece} · ${dossier.authFormData.pieceRef}`,
                      ],
                      ['E-mail', dossier.authFormData.email],
                      ['Téléphone', dossier.authFormData.tel],
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
                      ['Institution', dossier.authFormData.bac.institution],
                      ['E-mail institution', dossier.authFormData.bac.email],
                      ["Année d'obtention", dossier.authFormData.bac.annee],
                      ["Pays d'obtention", dossier.authFormData.bac.pays],
                      ['Adresse institution', dossier.authFormData.bac.adresse],
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
                      ['Institution', dossier.authFormData.doctorat.institution],
                      ['E-mail institution', dossier.authFormData.doctorat.email],
                      ["Année d'obtention", dossier.authFormData.doctorat.annee],
                      ["Pays d'obtention", dossier.authFormData.doctorat.pays],
                      ['Adresse institution', dossier.authFormData.doctorat.adresse],
                    ]}
                  />
                  {dossier.diplomaUrl && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                      <a href={dossier.diplomaUrl} target="_blank" rel="noopener noreferrer">
                        📎 Documents à authentifier (Bac + Doctorat)
                      </a>
                    </div>
                  )}
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
                {dossier.ficheUrl ? (
                  <a
                    className="n"
                    href={dossier.ficheUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📎 fiche-inscription-{dossier.reference}.pdf
                  </a>
                ) : (
                  <span className="n">📎 Fiche non encore transmise</span>
                )}
              </div>
            </div>

            <div className={`preview-box${recepissePreviewOpen ? ' show' : ''}`}>
              <div className="file-row" style={{ marginBottom: 0 }}>
                {dossier.recepisseUrl ? (
                  <a
                    className="n"
                    href={dossier.recepisseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📎 recepisse-{dossier.reference}.pdf
                  </a>
                ) : (
                  <span className="n">📎 Récépissé non encore transmis</span>
                )}
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
                    <input className="mono" readOnly value={fmtF(totalDue)} />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Payé</label>
                    <input
                      className="mono"
                      type="number"
                      step={1000}
                      value={payeInput}
                      onChange={(e) => setPayeInput(e.target.value)}
                      onBlur={() => void commitPaye()}
                    />
                  </div>
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label>Moyen de paiement</label>
                  <select
                    value={dossier.moyen}
                    onChange={(e) => void handleMoyenChange(e.target.value)}
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
                {dossier.comments
                  .filter((c) => c.type === 'public')
                  .map((c) => (
                    <div key={c.id} className="bubble pub">
                      {c.text}
                      <div className="meta">
                        {c.authorName} · {formatRelativeTime(c.createdAt)} ·{' '}
                        {formatDateTime(c.createdAt)}
                      </div>
                    </div>
                  ))}
                <textarea
                  placeholder="Ajouter un commentaire visible par le candidat…"
                  value={publicComment}
                  onChange={(e) => setPublicComment(e.target.value)}
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
                <button
                  type="button"
                  className={`btn btn-primary btn-sm${!publicComment.trim() || commentSubmitting ? ' is-disabled' : ''}`}
                  disabled={!publicComment.trim() || commentSubmitting}
                  style={{ marginTop: 8 }}
                  onClick={() => void submitComment('public')}
                >
                  {commentSubmitting ? 'Envoi…' : 'Publier'}
                </button>
              </div>
            )}
            {tab === 'int' && (
              <div className="tabpane on">
                {dossier.comments
                  .filter((c) => c.type === 'internal')
                  .map((c) => (
                    <div key={c.id} className="bubble int">
                      🔒 {c.text}
                      <div className="meta">
                        {c.authorName} · {formatRelativeTime(c.createdAt)} ·{' '}
                        {formatDateTime(c.createdAt)}
                      </div>
                    </div>
                  ))}
                <textarea
                  placeholder="Ajouter une note interne (non visible du candidat)…"
                  value={internalComment}
                  onChange={(e) => setInternalComment(e.target.value)}
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
                <button
                  type="button"
                  className={`btn btn-primary btn-sm${!internalComment.trim() || commentSubmitting ? ' is-disabled' : ''}`}
                  disabled={!internalComment.trim() || commentSubmitting}
                  style={{ marginTop: 8 }}
                  onClick={() => void submitComment('internal')}
                >
                  {commentSubmitting ? 'Envoi…' : 'Ajouter'}
                </button>
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
                      disabled={actionLoading}
                      onClick={() => void confirmAdvance()}
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
                      disabled={actionLoading}
                      onClick={() => void confirmRestore()}
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
                      disabled={actionLoading || !confirm.motif.trim()}
                      onClick={() => void confirmReject()}
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
