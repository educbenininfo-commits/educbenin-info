// frontend/src/components/backoffice/dossiers/DossierModal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { invalidateCachePrefix } from '@/lib/useApi';
import {
  STAGE_NAMES,
  fmtF,
  pillClass,
  displayName,
  specialtyLabel,
  formatRelativeTime,
  formatDateTime,
  isNationalCandidate,
  nextStageFor,
  prevStageFor,
  type DossierDetail,
} from '@/lib/dossiers-data';
import { findCountry } from '@/lib/countries';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';
import {
  fetchDossierDetail,
  updateDossierPayment,
  sendAuthForm,
  rejectDossier,
  restoreDossier,
  advanceDossier,
  retreatDossier,
  sendCorrection,
  editDossier,
  addDossierComment,
  uploadRecepisse,
  fetchDossierHistory,
  deleteDossier,
  dossierExportUrl,
  type AuditLogEntry,
} from '@/lib/dossiers-admin-api';

// #dossierOverlay / openModal / authButtonState / ficheButtonState /
// recepisseButtonState / showConfirm — DESIGN-SPEC.md section "10. Dossiers".
// Now backed by real data: the modal fetches its own detail by `id` on open
// (rendered with `key={id}` by the parent, so every re-open remounts fresh —
// same effect as the prototype's openModal() resetting tabs/previews/confirm
// each time) and every action calls the real admin route instead of mutating
// local state.

type AuthSendButtonState = { enabled: boolean; hidden: boolean; label: string; title: string };
type FicheButtonState = { enabled: boolean; title: string };
type RecepisseButtonState = {
  enabled: boolean;
  label: string;
  title: string;
  mode: 'add' | 'view' | 'none';
};

function countryLabel(iso2: string | undefined | null): string {
  if (!iso2) return '—';
  const c = findCountry(iso2);
  return c ? `${c.flag} ${c.nameFr}` : iso2;
}

// Flag emoji are regional-indicator surrogate pairs that jsPDF's standard
// (WinAnsi-only) fonts cannot encode — passing them to doc.text() corrupts
// the whole line's glyph widths, not just the emoji itself. PDF export uses
// the plain country name only; the emoji stays screen-only via countryLabel.
function countryLabelPlain(iso2: string | undefined | null): string {
  if (!iso2) return '—';
  const c = findCountry(iso2);
  return c ? c.nameFr : iso2;
}

// The auth-send button always stays clickable at stage 2, whether this is
// the first send or a resend — previously it disabled itself and showed
// only "En attente du candidat" the moment a link was sent, with no way
// to resend if the candidate never got it or made a mistake.
// 10-backoffice-dossiers.md: "Authentification du diplôme" only applies to
// foreign candidates — a national (Béninois) dossier never passes through
// stage 2 at all (see nextStageFor/prevStageFor), so the button has
// nothing to do for it and is hidden entirely rather than shown disabled
// with a misleading "already handled" label.
function authSendButtonState(d: DossierDetail): AuthSendButtonState {
  if (isNationalCandidate(d.nationalite)) {
    return { enabled: false, hidden: true, label: '', title: '' };
  }
  if (d.stage !== 2) {
    return {
      enabled: false,
      hidden: false,
      label: d.stage > 2 ? 'Authentification déjà traitée' : "Formulaire d'authentification",
      title:
        d.stage > 2
          ? 'Cette étape est déjà terminée pour ce dossier.'
          : 'Disponible une fois le dossier à l’étape « Authentification du diplôme en cours ».',
    };
  }
  return {
    enabled: true,
    hidden: false,
    label: d.authSentAt
      ? "Renvoyer le formulaire d'authentification"
      : "Envoyer le formulaire d'authentification",
    title: d.authSentAt
      ? 'Envoie un nouveau lien par WhatsApp (le précédent lien cesse de fonctionner).'
      : 'Envoie le lien du formulaire par WhatsApp au candidat.',
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
      label: 'Ajouter la preuve de dépôt (scan FSS)',
      title: 'Uploader le scan de la preuve de dépôt remise par la FSS au moment du dépôt.',
      mode: 'add',
    };
  }
  if (d.stage === 5 && d.recepisseUploaded) {
    return {
      enabled: true,
      label: 'Voir la preuve de dépôt',
      title: 'Afficher la preuve de dépôt transmise au candidat.',
      mode: 'view',
    };
  }
  return {
    enabled: false,
    label: 'Preuve de dépôt',
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

// Brand tokens (--prod-primary / --prod-ink / --prod-ink-faint / --prod-border,
// light-mode values from globals.css — PDF is a print artifact, independent of
// the viewer's OS theme) as plain RGB, since jsPDF has no CSS-variable concept.
const PDF_PRIMARY: [number, number, number] = [79, 70, 229];
const PDF_PRIMARY_DARK: [number, number, number] = [55, 48, 163];
const PDF_INK: [number, number, number] = [30, 27, 51];
const PDF_INK_FAINT: [number, number, number] = [110, 106, 130];
const PDF_BORDER: [number, number, number] = [228, 225, 240];

const PDF_MARGIN_X = 16;
const PDF_PAGE_BOTTOM = 282;
const PDF_LABEL_WIDTH = 52;

// Rasterizes the small square brand mark (public/logo/mark.svg) to a PNG data
// URL once per session — jsPDF.addImage() has no native SVG support, and a
// tiny flat-color mark rasterizes crisply at PDF header size (unlike the
// full text lockup, which would need real font embedding to stay sharp).
let logoDataUrlPromise: Promise<string | null> | null = null;
function loadLogoDataUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  logoDataUrlPromise ??= (async () => {
    try {
      const res = await fetch('/logo/mark.svg');
      const svgText = await res.text();
      const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      try {
        return await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const size = 128;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('2D canvas context unavailable'));
              return;
            }
            ctx.drawImage(img, 0, 0, size, size);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => reject(new Error('logo image failed to load'));
          img.src = url;
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      return null;
    }
  })();
  return logoDataUrlPromise;
}

async function downloadKvPdf(
  docTitle: string,
  reference: string,
  sections: { heading: string; pairs: [string, string | undefined][] }[],
  filename: string,
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PDF_MARGIN_X * 2;
  const logo = await loadLogoDataUrl();

  function drawHeader() {
    doc.setFillColor(...PDF_PRIMARY);
    doc.rect(0, 0, pageWidth, 26, 'F');
    if (logo) doc.addImage(logo, 'PNG', PDF_MARGIN_X, 6, 14, 14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('EDUC BÉNIN', PDF_MARGIN_X + 18, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Dossier de probatoire spécialité — FSS/UAC', PDF_MARGIN_X + 18, 19);
  }

  function drawFooter(pageNum: number, pageCount: number) {
    doc.setDrawColor(...PDF_BORDER);
    doc.line(PDF_MARGIN_X, 288, pageWidth - PDF_MARGIN_X, 288);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_INK_FAINT);
    const generated = `Généré depuis le back-office Educ Bénin · ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    doc.text(generated, PDF_MARGIN_X, 293);
    doc.text(`Page ${pageNum} / ${pageCount}`, pageWidth - PDF_MARGIN_X, 293, { align: 'right' });
  }

  drawHeader();
  let y = 38;
  doc.setTextColor(...PDF_INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(docTitle, PDF_MARGIN_X, y);
  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_PRIMARY_DARK);
  doc.text(`Réf. ${reference}`, PDF_MARGIN_X, y);
  y += 9;

  function ensureSpace(nextLineHeight: number) {
    if (y + nextLineHeight > PDF_PAGE_BOTTOM) {
      doc.addPage();
      drawHeader();
      y = 38;
    }
  }

  for (const section of sections) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_PRIMARY_DARK);
    doc.text(section.heading.toUpperCase(), PDF_MARGIN_X, y);
    y += 2.5;
    doc.setDrawColor(...PDF_PRIMARY);
    doc.line(PDF_MARGIN_X, y, PDF_MARGIN_X + contentWidth, y);
    y += 6.5;

    for (const [label, rawValue] of section.pairs) {
      const value = rawValue || '—';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const valueLines = doc.splitTextToSize(value, contentWidth - PDF_LABEL_WIDTH);
      const lineHeight = 5;
      const blockHeight = Math.max(1, valueLines.length) * lineHeight;
      ensureSpace(blockHeight);

      doc.setTextColor(...PDF_INK_FAINT);
      doc.text(label, PDF_MARGIN_X, y);
      doc.setTextColor(...PDF_INK);
      doc.setFont('helvetica', 'bold');
      doc.text(valueLines, PDF_MARGIN_X + PDF_LABEL_WIDTH, y);
      y += blockHeight + 2;
    }
    y += 3;
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    drawFooter(p, pageCount);
  }

  doc.save(filename);
}

type ConfirmState =
  | { kind: 'avancer' }
  | { kind: 'reculer' }
  | { kind: 'restaurer' }
  | { kind: 'rejeter'; motif: string }
  | null;

type EditDraft = {
  nom: string;
  prenom: string;
  whatsapp: string;
  nationalite: string;
  authEmail: string;
  authTel: string;
};

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
  const [tab, setTab] = useState<'pay' | 'pub' | 'int' | 'hist'>('pay');
  const [demandePreviewOpen, setDemandePreviewOpen] = useState(false);
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
  const [history, setHistory] = useState<AuditLogEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [correctionSending, setCorrectionSending] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const recepisseInputRef = useRef<HTMLInputElement>(null);
  const { role: myRole } = useBackofficeAdmin();
  const isSuperadmin = myRole === 'SUPERADMIN';

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

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetchDossierHistory(id);
      setHistory(res.items);
    } finally {
      setHistoryLoading(false);
    }
  }

  function selectTab(next: 'pay' | 'pub' | 'int' | 'hist') {
    setTab(next);
    if (next === 'hist' && history === null) void loadHistory();
  }

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

  const authSend = authSendButtonState(dossier);
  const fiche = ficheButtonState(dossier);
  const recepisse = recepisseButtonState(dossier);
  const canReject = dossier.stage >= 1 && dossier.stage <= 4;
  const canRestore = dossier.stage === 0;
  const canAdvance = dossier.stage >= 1 && dossier.stage <= 4;
  const canRetreat = dossier.stage >= 2 && dossier.stage <= 5;
  const canSendCorrection = dossier.stage === 1 || dossier.stage === 2;
  const isPendingCandidate =
    dossier.stage === 2 && Boolean(dossier.authSentAt) && !dossier.authSubmittedAt;
  const totalDue = dossier.montant + (dossier.montantSupplement ?? 0);
  const reste = Math.max(totalDue - dossier.paye, 0);

  async function handleAuthSendClick() {
    if (!authSend.enabled || !dossier) return;
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
  }

  async function handleSendCorrection() {
    if (!dossier) return;
    setActionError(null);
    setCorrectionSending(true);
    try {
      const res = await sendCorrection(dossier.id);
      const url = `${window.location.origin}${res.path}`;
      const message = `Bonjour, une correction est nécessaire sur votre dossier ${dossier.reference} chez Educ Bénin. Merci de la faire via ce lien : ${url}`;
      const digits = dossier.whatsapp.replace(/\D/g, '');
      window.open(
        `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer',
      );
      await load();
      invalidateCachePrefix('/api/admin/dossiers');
      onChanged();
    } catch {
      setActionError('Impossible de renvoyer ce dossier pour correction.');
    } finally {
      setCorrectionSending(false);
    }
  }

  async function handleDelete() {
    if (!dossier) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteDossier(dossier.id, deleteConfirmText.trim());
      invalidateCachePrefix('/api/admin/dossiers');
      onChanged();
      onClose();
    } catch {
      setDeleteError('Suppression impossible — vérifiez que la référence saisie est exacte.');
    } finally {
      setDeleteBusy(false);
    }
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
      setActionError('Impossible de transmettre la preuve de dépôt.');
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
  async function confirmRetreat() {
    if (!dossier) return;
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await retreatDossier(dossier.id);
      setDossier(res.dossier);
      invalidateCachePrefix('/api/admin/dossiers');
      onChanged();
      setConfirm(null);
    } catch {
      setActionError('Impossible de revenir à l’étape précédente.');
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

  function startEditing() {
    if (!dossier) return;
    setEditDraft({
      nom: dossier.nom,
      prenom: dossier.prenom,
      whatsapp: dossier.whatsapp,
      nationalite: dossier.nationalite ?? '',
      authEmail: dossier.authFormData?.email ?? '',
      authTel: dossier.authFormData?.tel ?? '',
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!dossier || !editDraft) return;
    setActionError(null);
    setActionLoading(true);
    try {
      const patch: Record<string, unknown> = {
        nom: editDraft.nom.trim(),
        prenom: editDraft.prenom.trim(),
        whatsapp: editDraft.whatsapp.trim(),
      };
      if (editDraft.nationalite) patch.nationalite = editDraft.nationalite;
      if (dossier.authFormData) {
        patch.authFormData = { email: editDraft.authEmail.trim(), tel: editDraft.authTel.trim() };
      }
      const res = await editDossier(dossier.id, patch);
      setDossier(res.dossier);
      invalidateCachePrefix('/api/admin/dossiers');
      onChanged();
      setEditing(false);
    } catch {
      setActionError('Impossible d’enregistrer ces corrections.');
    } finally {
      setActionLoading(false);
    }
  }

  function downloadDemandePdf() {
    if (!dossier) return;
    void downloadKvPdf(
      'Informations de la demande',
      dossier.reference,
      [
        {
          heading: 'Informations de la demande',
          pairs: [
            ['Nom', dossier.nom],
            ['Prénom(s)', dossier.prenom],
            ['WhatsApp', dossier.whatsapp],
            ['Nationalité', countryLabelPlain(dossier.nationalite)],
            ['Spécialité(s)', specialtyLabel(dossier.specialtyCodes)],
          ],
        },
      ],
      `demande-${dossier.reference}.pdf`,
    );
  }

  function downloadAuthPdf() {
    if (!dossier?.authFormData) return;
    const d = dossier.authFormData;
    void downloadKvPdf(
      'Authentification de diplôme — réponses soumises',
      dossier.reference,
      [
        {
          heading: 'Informations personnelles',
          pairs: [
            ['Nom', d.nom],
            ['Prénom(s)', d.prenom],
            ['Date de naissance', d.naissance],
            ['Lieu de naissance', d.lieuNaissance],
            ['Nationalité', countryLabelPlain(d.nationalite)],
            ['Adresse actuelle', d.adresse],
            ["Pièce d'identité", `${d.piece} · ${d.pieceRef}`],
            ['E-mail', d.email],
            ['Téléphone', d.tel],
          ],
        },
        {
          heading: 'Diplôme du Baccalauréat',
          pairs: [
            ['Institution', d.bac.institution],
            ['E-mail institution', d.bac.email],
            ["Année d'obtention", d.bac.annee],
            ["Pays d'obtention", countryLabelPlain(d.bac.pays)],
            ['Adresse institution', d.bac.adresse],
          ],
        },
        {
          heading: 'Diplôme du Doctorat',
          pairs: [
            ['Institution', d.doctorat.institution],
            ['E-mail institution', d.doctorat.email],
            ["Année d'obtention", d.doctorat.annee],
            ["Pays d'obtention", countryLabelPlain(d.doctorat.pays)],
            ['Adresse institution', d.doctorat.adresse],
          ],
        },
      ],
      `authentification-${dossier.reference}.pdf`,
    );
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
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`pill ${pillClass(dossier.stage)}`}>
                  {STAGE_NAMES[dossier.stage]}
                </span>
                {dossier.correctionRequestedAt && (
                  <span
                    className="pill"
                    style={{
                      background: 'var(--prod-warning-tint)',
                      color: 'var(--prod-warning)',
                    }}
                  >
                    Dossier MAJ
                  </span>
                )}
                {isPendingCandidate && (
                  <span className="pill" style={{ background: 'var(--prod-surface-2)' }}>
                    En attente du candidat
                  </span>
                )}
              </div>
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
                onClick={startEditing}
              >
                Modifier
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setDemandePreviewOpen((v) => !v)}
              >
                Voir la demande
              </button>
              <button
                type="button"
                className={`btn btn-outline btn-sm${canSendCorrection ? '' : ' is-disabled'}`}
                disabled={!canSendCorrection || correctionSending}
                title={
                  canSendCorrection
                    ? 'Renvoie au candidat le formulaire de cette étape, pré-rempli, pour correction.'
                    : 'Disponible aux étapes Demande et Authentification.'
                }
                onClick={handleSendCorrection}
              >
                {correctionSending ? 'Envoi…' : 'Renvoyer pour correction'}
              </button>
              {!authSend.hidden && (
                <button
                  type="button"
                  className={`btn btn-outline btn-sm${authSend.enabled ? '' : ' is-disabled'}`}
                  disabled={!authSend.enabled || actionLoading}
                  title={authSend.title}
                  onClick={handleAuthSendClick}
                >
                  {authSend.label}
                </button>
              )}
              {!authSend.hidden && dossier.authFormData && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setAuthPreviewOpen((v) => !v)}
                >
                  Voir le formulaire d&rsquo;authentification
                </button>
              )}
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

            {editing && editDraft && (
              <div className="preview-box show" style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8 }}>
                  Modifier les informations du dossier
                </div>
                <div className="row2">
                  <div className="field">
                    <label>Nom</label>
                    <input
                      value={editDraft.nom}
                      onChange={(e) => setEditDraft({ ...editDraft, nom: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Prénom(s)</label>
                    <input
                      value={editDraft.prenom}
                      onChange={(e) => setEditDraft({ ...editDraft, prenom: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>WhatsApp</label>
                  <input
                    value={editDraft.whatsapp}
                    onChange={(e) => setEditDraft({ ...editDraft, whatsapp: e.target.value })}
                  />
                </div>
                {dossier.authFormData && (
                  <div className="row2">
                    <div className="field">
                      <label>E-mail (formulaire d&rsquo;authentification)</label>
                      <input
                        value={editDraft.authEmail}
                        onChange={(e) => setEditDraft({ ...editDraft, authEmail: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Téléphone (formulaire d&rsquo;authentification)</label>
                      <input
                        value={editDraft.authTel}
                        onChange={(e) => setEditDraft({ ...editDraft, authTel: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={actionLoading}
                    onClick={saveEdit}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setEditing(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className={`preview-box${demandePreviewOpen ? ' show' : ''}`}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 2,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>Informations de la demande</div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={downloadDemandePdf}
                >
                  Télécharger en PDF
                </button>
              </div>
              <KvList
                pairs={[
                  ['Nom', dossier.nom],
                  ['Prénom(s)', dossier.prenom],
                  ['WhatsApp', dossier.whatsapp],
                  ['Nationalité', countryLabel(dossier.nationalite)],
                  ['Spécialité(s)', specialtyLabel(dossier.specialtyCodes)],
                ]}
              />
            </div>

            <div className={`preview-box${authPreviewOpen ? ' show' : ''}`}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 2,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>
                  Formulaire d&rsquo;authentification de diplôme — réponses soumises
                </div>
                {dossier.authFormData && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={downloadAuthPdf}
                  >
                    Télécharger en PDF
                  </button>
                )}
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
                      ['Nationalité', countryLabel(dossier.authFormData.nationalite)],
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
                      ["Pays d'obtention", countryLabel(dossier.authFormData.bac.pays)],
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
                      ["Pays d'obtention", countryLabel(dossier.authFormData.doctorat.pays)],
                      ['Adresse institution', dossier.authFormData.doctorat.adresse],
                    ]}
                  />
                  <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {dossier.diplomaBacUrl && (
                      <a href={dossier.diplomaBacUrl} target="_blank" rel="noopener noreferrer">
                        📎 Diplôme Bac
                      </a>
                    )}
                    {dossier.diplomaDoctoratUrl && (
                      <a
                        href={dossier.diplomaDoctoratUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📎 Diplôme Doctorat
                      </a>
                    )}
                    {dossier.diplomaBacTranslatedUrl && (
                      <a
                        href={dossier.diplomaBacTranslatedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📎 Traduction Bac
                      </a>
                    )}
                    {dossier.diplomaDoctoratTranslatedUrl && (
                      <a
                        href={dossier.diplomaDoctoratTranslatedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📎 Traduction Doctorat
                      </a>
                    )}
                  </div>
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
                    📎 preuve-depot-{dossier.reference}.pdf
                  </a>
                ) : (
                  <span className="n">📎 Preuve de dépôt non encore transmise</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="tabbtns">
              <button
                type="button"
                className={tab === 'pay' ? 'on' : ''}
                onClick={() => selectTab('pay')}
              >
                Paiement
              </button>
              <button
                type="button"
                className={tab === 'pub' ? 'on' : ''}
                onClick={() => selectTab('pub')}
              >
                Commentaires publics
              </button>
              <button
                type="button"
                className={tab === 'int' ? 'on' : ''}
                onClick={() => selectTab('int')}
              >
                Commentaires internes
              </button>
              <button
                type="button"
                className={tab === 'hist' ? 'on' : ''}
                onClick={() => selectTab('hist')}
              >
                Historique
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
                <div className="pay-field-row" style={{ marginTop: 14 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
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
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Reste à payer</label>
                    <div
                      className={`pay-summary ${reste > 0 ? 'due' : 'clear'}`}
                      style={{ height: 42, display: 'flex', justifyContent: 'center' }}
                    >
                      <span className="v">{fmtF(reste)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {tab === 'pub' && (
              <div className="tabpane on">
                <p className="hint" style={{ marginBottom: 10 }}>
                  Visible par le candidat sur sa page de suivi, quelle que soit l&rsquo;étape ou le
                  statut du dossier.
                </p>
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
            {tab === 'hist' && (
              <div className="tabpane on">
                {historyLoading ? (
                  <p className="hint">Chargement…</p>
                ) : !history || history.length === 0 ? (
                  <p className="hint">Aucune action enregistrée pour ce dossier.</p>
                ) : (
                  history.map((h) => (
                    <div key={h.id} className="bubble int" style={{ marginBottom: 8 }}>
                      <strong>{h.action}</strong>
                      <div className="meta">{formatDateTime(h.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {confirm && (
            <div className="confirm-inline show">
              {confirm.kind === 'avancer' && (
                <>
                  Confirmer le passage de <strong>« {STAGE_NAMES[dossier.stage]} »</strong> à{' '}
                  <strong>
                    « {STAGE_NAMES[nextStageFor(dossier.stage, dossier.nationalite)]} »
                  </strong>{' '}
                  ?
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
              {confirm.kind === 'reculer' && (
                <>
                  Revenir de <strong>« {STAGE_NAMES[dossier.stage]} »</strong> à{' '}
                  <strong>
                    « {STAGE_NAMES[prevStageFor(dossier.stage, dossier.nationalite)]} »
                  </strong>{' '}
                  ?
                  <div className="go">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading}
                      onClick={() => void confirmRetreat()}
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
          <div className="modal-foot-group">
            <button
              type="button"
              className={`btn btn-outline btn-sm${canRetreat ? '' : ' is-disabled'}`}
              disabled={!canRetreat}
              title={
                canRetreat
                  ? 'Revenir à l’étape précédente.'
                  : 'Disponible à partir de l’étape « Authentification du diplôme en cours ».'
              }
              onClick={() => canRetreat && setConfirm({ kind: 'reculer' })}
            >
              ← Étape précédente
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
              {dossier.stage === 5 ? 'Dossier finalisé ✓' : 'Passer à l’étape suivante →'}
            </button>
          </div>

          <div className="modal-foot-group">
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
          </div>

          {isSuperadmin && (
            <div className="modal-foot-group">
              <a
                className="btn btn-outline btn-sm"
                href={dossierExportUrl(dossier.id)}
                target="_blank"
                rel="noopener noreferrer"
                title="Télécharge un .zip avec toutes les informations et tous les fichiers de ce dossier."
              >
                Télécharger le dossier (.zip)
              </a>
              <button
                type="button"
                className="btn btn-danger-outline btn-sm"
                title="Suppression définitive et irréversible du dossier."
                onClick={() => {
                  setDeleteConfirmText('');
                  setDeleteError(null);
                  setDeleteModalOpen(true);
                }}
              >
                Supprimer définitivement
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteModalOpen && (
        <div
          className="overlay show"
          onClick={(e) => e.target === e.currentTarget && !deleteBusy && setDeleteModalOpen(false)}
        >
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h3>Supprimer le dossier {dossier.reference}</h3>
              <button type="button" className="x" onClick={() => setDeleteModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="err-msg" style={{ marginBottom: 12 }}>
                Cette action est irréversible : le dossier, ses commentaires et tous ses fichiers
                seront définitivement supprimés.
              </p>
              <div className="field">
                <label>
                  Pour confirmer, saisissez exactement la référence :{' '}
                  <strong>{dossier.reference}</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoFocus
                />
              </div>
              {deleteError && <p className="err-msg">{deleteError}</p>}
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteModalOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-danger-outline"
                disabled={deleteConfirmText.trim() !== dossier.reference || deleteBusy}
                onClick={handleDelete}
              >
                {deleteBusy ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
