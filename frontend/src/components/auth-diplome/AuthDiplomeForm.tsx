'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchAuthFormState,
  submitAuthForm,
  DossierApiError,
  type AuthTokenState,
} from '@/lib/dossiers-public-api';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';
import { CountrySelect } from '@/components/forms/CountrySelect';
import { CountryPhoneInput } from '@/components/forms/CountryPhoneInput';
import { DatePicker } from '@/components/forms/DatePicker';
import { UploadHint } from '@/components/forms/UploadHint';
import { detectDefaultCountry } from '@/lib/countries';

type ViewState = 'loading' | 'ready' | 'submitted' | AuthTokenState;

interface Institution {
  institution: string;
  email: string;
  annee: string;
  pays: string;
  adresse: string;
}

const EMPTY_INSTITUTION: Institution = {
  institution: '',
  email: '',
  annee: '',
  pays: '',
  adresse: '',
};

const REASON_COPY: Record<
  'invalid' | 'expired' | 'already-submitted' | 'wrong-stage',
  { title: string; body: string }
> = {
  invalid: {
    title: 'Lien invalide',
    body: "Ce lien d'authentification de diplôme n'est pas reconnu. Vérifiez le lien reçu par WhatsApp ou contactez notre équipe.",
  },
  expired: {
    title: 'Lien expiré',
    body: "Ce lien d'authentification de diplôme a expiré. Contactez notre équipe pour en recevoir un nouveau.",
  },
  'already-submitted': {
    title: 'Formulaire déjà soumis',
    body: "Vous avez déjà transmis vos informations d'authentification de diplôme pour ce dossier.",
  },
  'wrong-stage': {
    title: 'Étape non disponible',
    body: "Ce formulaire n'est plus disponible pour ce dossier — son traitement a avancé à une autre étape.",
  },
};

// Maps a server error code to a specific, actionable message — previously
// every failure (expired token, oversized file, invalid e-mail…) showed
// the exact same generic sentence, which made a fully-filled form look
// like it was failing for no reason.
function submitErrorMessage(err: unknown): string {
  if (err instanceof DossierApiError) {
    switch (err.code) {
      case 'TOKEN_EXPIRED':
        return "Ce lien a expiré. Contactez l'équipe Educ Bénin pour en recevoir un nouveau.";
      case 'TOKEN_ALREADY_SUBMITTED':
        return 'Ce formulaire a déjà été soumis pour ce dossier.';
      case 'TOKEN_WRONG_STAGE':
      case 'TOKEN_INVALID':
        return "Ce lien n'est plus valide. Contactez l'équipe Educ Bénin.";
      case 'FILE_TOO_LARGE':
        return 'Un des fichiers dépasse 5 Mo. Compressez-le (lien ci-dessus) puis réessayez.';
      case 'INVALID_MIME':
      case 'MAGIC_BYTE_MISMATCH':
        return "Un des fichiers n'est pas un PDF valide.";
      case 'TIMEOUT':
        return 'La requête a pris trop de temps. Vérifiez votre connexion et réessayez.';
      case 'VALIDATION_FAILED':
        return 'Merci de vérifier vos informations — un champ est probablement mal rempli (adresse e-mail invalide, par exemple).';
      default:
        return 'Votre formulaire n’a pas pu être envoyé. Merci de vérifier vos informations et de réessayer.';
    }
  }
  return 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.';
}

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
        <div className="k">Formulaire d&rsquo;authentification</div>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
    </div>
  );
}

export function AuthDiplomeForm({ token }: { token: string }) {
  const [view, setView] = useState<ViewState>('loading');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());

  const [personal, setPersonal] = useState({
    nom: '',
    prenom: '',
    naissance: '',
    lieuNaissance: '',
    nationalite: detectDefaultCountry(),
    adresse: '',
    piece: '',
    pieceRef: '',
    email: '',
    tel: '',
  });
  const [bac, setBac] = useState<Institution>({
    ...EMPTY_INSTITUTION,
    pays: detectDefaultCountry(),
  });
  const [doctorat, setDoctorat] = useState<Institution>({
    ...EMPTY_INSTITUTION,
    pays: detectDefaultCountry(),
  });
  const [diplomeNonFrancais, setDiplomeNonFrancais] = useState(false);
  const [documentsBac, setDocumentsBac] = useState<File | null>(null);
  const [documentsDoctorat, setDocumentsDoctorat] = useState<File | null>(null);
  const [documentsBacTraduit, setDocumentsBacTraduit] = useState<File | null>(null);
  const [documentsDoctoratTraduit, setDocumentsDoctoratTraduit] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchAuthFormState(token);
      if (cancelled) return;
      if (result.valid) {
        setReference(result.reference);
        // Prefill on a resend-for-correction — the candidate's previous
        // answers are already on file, they only need to fix what's wrong.
        if (result.authFormData) {
          const d = result.authFormData;
          setPersonal({
            nom: d.nom,
            prenom: d.prenom,
            naissance: d.naissance,
            lieuNaissance: d.lieuNaissance,
            nationalite: d.nationalite,
            adresse: d.adresse,
            piece: d.piece,
            pieceRef: d.pieceRef,
            email: d.email,
            tel: d.tel,
          });
          setBac(d.bac);
          setDoctorat(d.doctorat);
          setDiplomeNonFrancais(d.diplomeNonFrancais);
        }
        setView('ready');
      } else {
        setView(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function personalField(key: keyof typeof personal) {
    return {
      value: personal[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setPersonal((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }
  function institutionField(
    which: 'bac' | 'doctorat',
    key: keyof Institution,
  ): { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void } {
    const [state, setState] = which === 'bac' ? [bac, setBac] : [doctorat, setDoctorat];
    return {
      value: state[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setState((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }
  const hasErr = (key: string) => errorFields.has(key);

  async function handleSubmit() {
    const missing = new Set<string>();
    for (const [k, v] of Object.entries(personal)) if (!v.trim()) missing.add(`personal.${k}`);
    for (const [k, v] of Object.entries(bac)) if (!v.trim()) missing.add(`bac.${k}`);
    for (const [k, v] of Object.entries(doctorat)) if (!v.trim()) missing.add(`doctorat.${k}`);
    if (!documentsBac) missing.add('documentsBac');
    if (!documentsDoctorat) missing.add('documentsDoctorat');
    if (diplomeNonFrancais) {
      if (!documentsBacTraduit) missing.add('documentsBacTraduit');
      if (!documentsDoctoratTraduit) missing.add('documentsDoctoratTraduit');
    }
    if (missing.size > 0) {
      setErrorFields(missing);
      setSubmitError(
        'Merci de renseigner tous les champs et de joindre les documents requis (en rouge ci-dessus).',
      );
      return;
    }

    setErrorFields(new Set());
    setSubmitError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      for (const [k, v] of Object.entries(personal)) form.append(k, v.trim());
      for (const [k, v] of Object.entries(bac)) form.append(`bac.${k}`, v.trim());
      for (const [k, v] of Object.entries(doctorat)) form.append(`doctorat.${k}`, v.trim());
      form.append('diplomeNonFrancais', String(diplomeNonFrancais));
      form.append('documentsBac', documentsBac!);
      form.append('documentsDoctorat', documentsDoctorat!);
      if (diplomeNonFrancais) {
        form.append('documentsBacTraduit', documentsBacTraduit!);
        form.append('documentsDoctoratTraduit', documentsDoctoratTraduit!);
      }

      await submitAuthForm(token, form);
      setView('submitted');
    } catch (err) {
      setSubmitError(submitErrorMessage(err));
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
          <div className="k">Formulaire d&rsquo;authentification</div>
          <h1>Formulaire bien reçu</h1>
          <p>Votre dossier : {reference}</p>
        </div>
        <div className="section pw">
          <div className="callout warn">
            <span className="icn">⛔</span>
            <span>
              <strong>TRÈS IMPORTANT</strong> — vous recevrez par e-mail, sous quelques jours, une
              attestation ou un récépissé de dépôt d&rsquo;authentification pour chaque diplôme.
              Surveillez votre boîte mail.
            </span>
          </div>
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
        <div className="k">Formulaire d&rsquo;authentification</div>
        <h1>Authentification de vos diplômes</h1>
        <p>
          Remplissez ce formulaire pour l&rsquo;authentification de votre diplôme du Baccalauréat et
          de votre diplôme du Doctorat en Médecine, dans le cadre de votre dossier de probatoire
          spécialité.
        </p>
      </div>

      <div className="section pw">
        <div
          className="price-box"
          style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="hint">N° DE DOSSIER</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 16 }}>
              {reference}
            </span>
          </div>
          <span className="hint">🔒 pré-rempli, non modifiable</span>
        </div>

        <div className="callout warn" style={{ marginBottom: 20 }}>
          <span className="icn">⚠️</span>
          <span>
            Les nom et prénom saisis ci-dessous doivent être <strong>strictement conformes</strong>{' '}
            à ceux inscrits sur votre diplôme.
          </span>
        </div>

        <div className="doc-card">
          <div className="section-lbl" style={{ marginTop: 0 }}>
            Informations personnelles
          </div>
          <div className="row2">
            <div className="field">
              <label>Nom</label>
              <input
                className={hasErr('personal.nom') ? 'err' : undefined}
                placeholder="SOSSOU"
                {...personalField('nom')}
              />
            </div>
            <div className="field">
              <label>Prénom(s)</label>
              <input
                className={hasErr('personal.prenom') ? 'err' : undefined}
                placeholder="Théodore"
                {...personalField('prenom')}
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Date de naissance</label>
              <DatePicker
                error={hasErr('personal.naissance')}
                value={personal.naissance}
                onChange={(v) => setPersonal((p) => ({ ...p, naissance: v }))}
              />
            </div>
            <div className="field">
              <label>Lieu de naissance</label>
              <input
                className={hasErr('personal.lieuNaissance') ? 'err' : undefined}
                placeholder="Cotonou"
                {...personalField('lieuNaissance')}
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Nationalité</label>
              <CountrySelect
                error={hasErr('personal.nationalite')}
                value={personal.nationalite}
                onChange={(v) => setPersonal((p) => ({ ...p, nationalite: v }))}
              />
            </div>
            <div className="field">
              <label>Adresse actuelle</label>
              <input
                className={hasErr('personal.adresse') ? 'err' : undefined}
                placeholder="Cotonou, Bénin"
                {...personalField('adresse')}
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Type de pièce d&rsquo;identité</label>
              <select
                className={hasErr('personal.piece') ? 'err' : undefined}
                {...personalField('piece')}
              >
                <option value="">Sélectionnez…</option>
                <option value="Carte d'identité (CIP)">Carte d&rsquo;identité (CIP)</option>
                <option value="Passeport">Passeport</option>
              </select>
            </div>
            <div className="field">
              <label>Référence de la pièce</label>
              <input
                className={hasErr('personal.pieceRef') ? 'err' : undefined}
                placeholder="N° du document"
                {...personalField('pieceRef')}
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                className={hasErr('personal.email') ? 'err' : undefined}
                placeholder="vous@exemple.bj"
                {...personalField('email')}
              />
            </div>
            <div className="field">
              <label>Téléphone</label>
              <CountryPhoneInput
                error={hasErr('personal.tel')}
                value={personal.tel}
                onChange={(v) => setPersonal((p) => ({ ...p, tel: v }))}
              />
            </div>
          </div>

          <div className="section-lbl">Diplôme du Baccalauréat</div>
          <p className="hint" style={{ marginTop: -8, marginBottom: 10 }}>
            Si votre diplôme n&rsquo;est pas rédigé en français, faites-le traduire par le ministère
            des Affaires étrangères de votre pays avant de le soumettre.
          </p>
          <div className="row2">
            <div className="field">
              <label>Institution étatique délivrant ce diplôme</label>
              <input
                className={hasErr('bac.institution') ? 'err' : undefined}
                placeholder="Office du Baccalauréat du Bénin"
                {...institutionField('bac', 'institution')}
              />
            </div>
            <div className="field">
              <label>E-mail de l&rsquo;institution</label>
              <input
                type="email"
                className={hasErr('bac.email') ? 'err' : undefined}
                placeholder="contact@institution.bj"
                {...institutionField('bac', 'email')}
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Année d&rsquo;obtention</label>
              <input
                className={hasErr('bac.annee') ? 'err' : undefined}
                placeholder="2016"
                {...institutionField('bac', 'annee')}
              />
            </div>
            <div className="field">
              <label>Pays d&rsquo;obtention</label>
              <CountrySelect
                error={hasErr('bac.pays')}
                value={bac.pays}
                onChange={(v) => setBac((p) => ({ ...p, pays: v }))}
              />
            </div>
          </div>
          <div className="field">
            <label>Adresse de l&rsquo;institution</label>
            <input
              className={hasErr('bac.adresse') ? 'err' : undefined}
              placeholder="Adresse précise"
              {...institutionField('bac', 'adresse')}
            />
          </div>

          <div className="section-lbl">Diplôme du Doctorat</div>
          <div className="row2">
            <div className="field">
              <label>Institution étatique délivrant ce diplôme</label>
              <input
                className={hasErr('doctorat.institution') ? 'err' : undefined}
                placeholder="Nom de l'institution"
                {...institutionField('doctorat', 'institution')}
              />
            </div>
            <div className="field">
              <label>E-mail de l&rsquo;institution</label>
              <input
                type="email"
                className={hasErr('doctorat.email') ? 'err' : undefined}
                placeholder="contact@institution.bj"
                {...institutionField('doctorat', 'email')}
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Année d&rsquo;obtention</label>
              <input
                className={hasErr('doctorat.annee') ? 'err' : undefined}
                placeholder="2023"
                {...institutionField('doctorat', 'annee')}
              />
            </div>
            <div className="field">
              <label>Pays d&rsquo;obtention</label>
              <CountrySelect
                error={hasErr('doctorat.pays')}
                value={doctorat.pays}
                onChange={(v) => setDoctorat((p) => ({ ...p, pays: v }))}
              />
            </div>
          </div>
          <div className="field">
            <label>Adresse de l&rsquo;institution</label>
            <input
              className={hasErr('doctorat.adresse') ? 'err' : undefined}
              placeholder="Adresse précise"
              {...institutionField('doctorat', 'adresse')}
            />
          </div>

          <div className="section-lbl">Documents à authentifier</div>
          <UploadHint maxMb={5} />
          <div className="row2">
            <div className="field">
              <label>Diplôme du Baccalauréat (PDF)</label>
              <label
                className={`dropzone${hasErr('documentsBac') ? ' err' : ''}`}
                style={{ display: 'block', cursor: 'pointer' }}
              >
                {documentsBac ? documentsBac.name : 'Cliquez pour choisir le fichier'}
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => setDocumentsBac(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="field">
              <label>Diplôme du Doctorat (PDF)</label>
              <label
                className={`dropzone${hasErr('documentsDoctorat') ? ' err' : ''}`}
                style={{ display: 'block', cursor: 'pointer' }}
              >
                {documentsDoctorat ? documentsDoctorat.name : 'Cliquez pour choisir le fichier'}
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => setDocumentsDoctorat(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <label
            className="check-row"
            style={{
              marginTop: 10,
              background: 'var(--prod-gold-tint)',
              padding: 12,
              borderRadius: 10,
            }}
          >
            <input
              type="checkbox"
              checked={diplomeNonFrancais}
              onChange={(e) => setDiplomeNonFrancais(e.target.checked)}
            />
            <span>
              Cocher cette case si l&rsquo;original de votre diplôme n&rsquo;est pas en français,
              afin d&rsquo;ajouter les documents traduits.
            </span>
          </label>

          {diplomeNonFrancais && (
            <div className="row2" style={{ marginTop: 14 }}>
              <div className="field">
                <label>Traduction du diplôme du Baccalauréat (PDF)</label>
                <label
                  className={`dropzone${hasErr('documentsBacTraduit') ? ' err' : ''}`}
                  style={{ display: 'block', cursor: 'pointer' }}
                >
                  {documentsBacTraduit
                    ? documentsBacTraduit.name
                    : 'Cliquez pour choisir le fichier'}
                  <input
                    type="file"
                    accept="application/pdf"
                    hidden
                    onChange={(e) => setDocumentsBacTraduit(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="field">
                <label>Traduction du diplôme du Doctorat (PDF)</label>
                <label
                  className={`dropzone${hasErr('documentsDoctoratTraduit') ? ' err' : ''}`}
                  style={{ display: 'block', cursor: 'pointer' }}
                >
                  {documentsDoctoratTraduit
                    ? documentsDoctoratTraduit.name
                    : 'Cliquez pour choisir le fichier'}
                  <input
                    type="file"
                    accept="application/pdf"
                    hidden
                    onChange={(e) => setDocumentsDoctoratTraduit(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="callout warn" style={{ marginTop: 20 }}>
          <span className="icn">⛔</span>
          <span>
            <strong>TRÈS IMPORTANT</strong> — vous recevrez par e-mail, sous quelques jours, une
            attestation ou un récépissé de dépôt d&rsquo;authentification pour chaque diplôme.
            Surveillez votre boîte mail.
          </span>
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
          {submitting ? 'Envoi en cours…' : 'Envoyer mes informations'}
        </button>
      </div>
    </div>
  );
}
