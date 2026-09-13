'use client';

// Public "corriger ma demande" form — reached via the token link an admin
// sends from the back-office's "Renvoyer pour correction" action on a
// stage-1 dossier (rejected, or a comment asked for a fix). Pre-filled
// from the dossier's existing data; submitting updates the SAME dossier
// (never creates a new one) and clears its "Dossier MAJ" flag.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  fetchCorrectionState,
  submitCorrection,
  DossierApiError,
  type CorrectionTokenState,
} from '@/lib/dossiers-public-api';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';
import { SPECIALTIES } from '@/lib/specialties';
import { CountrySelect } from '@/components/forms/CountrySelect';
import { CountryPhoneInput } from '@/components/forms/CountryPhoneInput';
import { UploadHint } from '@/components/forms/UploadHint';
import { detectDefaultCountry } from '@/lib/countries';

type ViewState = 'loading' | 'ready' | 'submitted' | CorrectionTokenState;

const REASON_COPY: Record<'invalid' | 'expired' | 'wrong-stage', { title: string; body: string }> =
  {
    invalid: {
      title: 'Lien invalide',
      body: "Ce lien de correction n'est pas reconnu. Vérifiez le lien reçu par WhatsApp ou contactez notre équipe.",
    },
    expired: {
      title: 'Lien expiré',
      body: 'Ce lien de correction a expiré. Contactez notre équipe pour en recevoir un nouveau.',
    },
    'wrong-stage': {
      title: 'Étape non disponible',
      body: "Ce formulaire n'est plus disponible pour ce dossier — son traitement a avancé à une autre étape.",
    },
  };

function BareHeader() {
  return (
    <div className="nav-bleed">
      <div className="p-nav pw" style={{ justifyContent: 'center' }}>
        <Link href="/" className="p-logo">
          <EducBeninLogo height={32} />
        </Link>
      </div>
    </div>
  );
}

function MessageScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="prod">
      <BareHeader />
      <div className="page-head pw">
        <div className="k">Correction de dossier</div>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
    </div>
  );
}

export function CorrectionForm({ token }: { token: string }) {
  const [view, setView] = useState<ViewState>('loading');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nationalite, setNationalite] = useState(detectDefaultCountry());
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchCorrectionState(token);
      if (cancelled) return;
      if (result.valid) {
        setReference(result.reference);
        setNom(result.prefill.nom);
        setPrenom(result.prefill.prenom);
        setWhatsapp(result.prefill.whatsapp);
        if (result.prefill.nationalite) setNationalite(result.prefill.nationalite);
        setSelectedCodes(result.prefill.specialtyCodes);
        setView('ready');
      } else {
        setView(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function toggleChip(code: string) {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function handleSubmit() {
    if (!nom.trim() || !prenom.trim() || !whatsapp.trim() || selectedCodes.length === 0) {
      setSubmitError('Merci de renseigner tous les champs et de choisir au moins une spécialité.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('nom', nom.trim());
      form.append('prenom', prenom.trim());
      form.append('whatsapp', whatsapp.trim());
      form.append('nationalite', nationalite);
      for (const code of selectedCodes) form.append('specialtyCodes', code);
      if (file) form.append('pdf', file);

      await submitCorrection(token, form);
      setView('submitted');
    } catch (err) {
      setSubmitError(
        err instanceof DossierApiError
          ? 'Votre correction n’a pas pu être envoyée. Merci de vérifier vos informations et de réessayer.'
          : 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (view === 'loading') {
    return (
      <div className="prod" style={{ minHeight: '100vh' }}>
        <BareHeader />
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '80px 24px',
            color: 'var(--prod-ink-muted)',
            fontSize: 13.5,
          }}
        >
          Vérification du lien…
        </div>
      </div>
    );
  }

  if (view === 'submitted') {
    return (
      <div className="prod">
        <BareHeader />
        <div className="page-head pw">
          <div className="k">Correction de dossier</div>
          <h1>Correction bien reçue</h1>
          <p>Votre dossier {reference} a été mis à jour. Notre équipe reprend son traitement.</p>
        </div>
      </div>
    );
  }

  if (view !== 'ready' && 'reason' in view) {
    const copy = REASON_COPY[view.reason];
    return <MessageScreen title={copy.title} body={copy.body} />;
  }

  return (
    <div className="prod">
      <BareHeader />
      <div className="page-head pw">
        <div className="k">Correction de dossier</div>
        <h1>Corrigez votre demande</h1>
        <p>Dossier {reference} — vérifiez et corrigez vos informations, puis renvoyez-les.</p>
      </div>

      <div className="section pw">
        <div className="doc-card">
          <div className="field">
            <label>Spécialité(s)</label>
          </div>
          <div className="chipwrap">
            {SPECIALTIES.map((s) => (
              <div
                key={s.code}
                className={`chip${selectedCodes.includes(s.code) ? ' sel' : ''}`}
                onClick={() => toggleChip(s.code)}
              >
                {s.name}
              </div>
            ))}
          </div>

          <div className="row2" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Nom</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="field">
              <label>Prénom</label>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Nationalité</label>
            <CountrySelect value={nationalite} onChange={setNationalite} />
          </div>
          <div className="field">
            <label>Numéro WhatsApp</label>
            <CountryPhoneInput value={whatsapp} onChange={setWhatsapp} />
          </div>

          <div className="field">
            <label>Remplacer le dossier PDF (optionnel)</label>
            <UploadHint maxMb={5} />
            <label className="dropzone" style={{ display: 'block', cursor: 'pointer' }}>
              {file ? file.name : 'Laissez vide pour garder le fichier déjà transmis'}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        {submitError && (
          <p className="err-msg" style={{ marginTop: 12 }}>
            {submitError}
          </p>
        )}

        <button
          type="button"
          className={`btn btn-primary btn-block${submitting ? ' is-disabled' : ''}`}
          disabled={submitting}
          style={{ marginTop: 16 }}
          onClick={handleSubmit}
        >
          {submitting ? 'Envoi en cours…' : 'Renvoyer ma demande corrigée'}
        </button>
      </div>
    </div>
  );
}
