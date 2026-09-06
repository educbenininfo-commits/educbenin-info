'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchAuthFormState,
  submitAuthForm,
  DossierApiError,
  type AuthTokenState,
} from '@/lib/dossiers-public-api';

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

function BareHeader() {
  return (
    <div className="nav-bleed">
      <div className="p-nav pw" style={{ justifyContent: 'center' }}>
        <Link href="/" className="p-logo">
          <img
            src="/logo/lockup-light.svg"
            alt="Educ Bénin"
            height={32}
            style={{ height: 32, width: 'auto' }}
          />
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

  const [personal, setPersonal] = useState({
    nom: '',
    prenom: '',
    naissance: '',
    lieuNaissance: '',
    nationalite: '',
    adresse: '',
    piece: '',
    pieceRef: '',
    email: '',
    tel: '',
  });
  const [bac, setBac] = useState<Institution>(EMPTY_INSTITUTION);
  const [doctorat, setDoctorat] = useState<Institution>(EMPTY_INSTITUTION);
  const [documentsFile, setDocumentsFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchAuthFormState(token);
      if (cancelled) return;
      if (result.valid) {
        setReference(result.reference);
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
      // `piece` binds this to a <select> (see the render below); every other
      // key binds it to an <input>. HTMLInputElement | HTMLSelectElement
      // covers both without a second, near-duplicate helper.
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

  async function handleSubmit() {
    const allFilled =
      Object.values(personal).every((v) => v.trim().length > 0) &&
      Object.values(bac).every((v) => v.trim().length > 0) &&
      Object.values(doctorat).every((v) => v.trim().length > 0);
    if (!allFilled || !documentsFile) {
      setSubmitError(
        'Merci de renseigner tous les champs et de joindre vos documents à authentifier.',
      );
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      for (const [k, v] of Object.entries(personal)) form.append(k, v.trim());
      for (const [k, v] of Object.entries(bac)) form.append(`bac.${k}`, v.trim());
      for (const [k, v] of Object.entries(doctorat)) form.append(`doctorat.${k}`, v.trim());
      form.append('documents', documentsFile);

      await submitAuthForm(token, form);
      setView('submitted');
    } catch (err) {
      setSubmitError(
        err instanceof DossierApiError
          ? 'Votre formulaire n’a pas pu être envoyé. Merci de vérifier vos informations et de réessayer.'
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

  const documentsFileName = documentsFile
    ? `diplôme-${personal.nom.toLowerCase()}-${personal.prenom.toLowerCase()}.pdf`
    : null;

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

        <div className="doc-card">
          <div className="section-lbl" style={{ marginTop: 0 }}>
            Informations personnelles
          </div>
          <div className="row2">
            <div className="field">
              <label>Nom</label>
              <input placeholder="SOSSOU" {...personalField('nom')} />
            </div>
            <div className="field">
              <label>Prénom(s)</label>
              <input placeholder="Théodore" {...personalField('prenom')} />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Date de naissance</label>
              <input placeholder="JJ/MM/AAAA" {...personalField('naissance')} />
            </div>
            <div className="field">
              <label>Lieu de naissance</label>
              <input placeholder="Cotonou" {...personalField('lieuNaissance')} />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Nationalité</label>
              <input placeholder="Béninoise" {...personalField('nationalite')} />
            </div>
            <div className="field">
              <label>Adresse actuelle</label>
              <input placeholder="Cotonou, Bénin" {...personalField('adresse')} />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Type de pièce d&rsquo;identité</label>
              <select {...personalField('piece')}>
                <option value="">Sélectionnez…</option>
                <option value="Carte d'identité (CIP)">Carte d&rsquo;identité (CIP)</option>
                <option value="Passeport">Passeport</option>
              </select>
            </div>
            <div className="field">
              <label>Référence de la pièce</label>
              <input placeholder="N° du document" {...personalField('pieceRef')} />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>E-mail</label>
              <input type="email" placeholder="vous@exemple.bj" {...personalField('email')} />
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input placeholder="+229 97 00 00 00" {...personalField('tel')} />
            </div>
          </div>

          <div className="section-lbl">Diplôme du Baccalauréat</div>
          <div className="row2">
            <div className="field">
              <label>Institution (établissement étatique)</label>
              <input
                placeholder="Office du Baccalauréat du Bénin"
                {...institutionField('bac', 'institution')}
              />
            </div>
            <div className="field">
              <label>E-mail de l&rsquo;institution</label>
              <input
                type="email"
                placeholder="contact@institution.bj"
                {...institutionField('bac', 'email')}
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Année d&rsquo;obtention</label>
              <input placeholder="2016" {...institutionField('bac', 'annee')} />
            </div>
            <div className="field">
              <label>Pays d&rsquo;obtention</label>
              <input placeholder="Bénin" {...institutionField('bac', 'pays')} />
            </div>
          </div>
          <div className="field">
            <label>Adresse de l&rsquo;institution</label>
            <input placeholder="Adresse précise" {...institutionField('bac', 'adresse')} />
          </div>

          <div className="section-lbl">Diplôme du Doctorat</div>
          <div className="row2">
            <div className="field">
              <label>Institution (établissement étatique)</label>
              <input
                placeholder="Nom de l'institution"
                {...institutionField('doctorat', 'institution')}
              />
            </div>
            <div className="field">
              <label>E-mail de l&rsquo;institution</label>
              <input
                type="email"
                placeholder="contact@institution.bj"
                {...institutionField('doctorat', 'email')}
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Année d&rsquo;obtention</label>
              <input placeholder="2023" {...institutionField('doctorat', 'annee')} />
            </div>
            <div className="field">
              <label>Pays d&rsquo;obtention</label>
              <input placeholder="Bénin" {...institutionField('doctorat', 'pays')} />
            </div>
          </div>
          <div className="field">
            <label>Adresse de l&rsquo;institution</label>
            <input placeholder="Adresse précise" {...institutionField('doctorat', 'adresse')} />
          </div>

          <div className="section-lbl">Documents à authentifier</div>
          <div className="field">
            <label>Diplôme du Baccalauréat + diplôme du Doctorat (un seul PDF)</label>
            <p className="hint" style={{ marginTop: -6, marginBottom: 8 }}>
              Combinez les deux diplômes (Bac et Doctorat) dans un seul fichier PDF avant de
              l&rsquo;envoyer — cela réduit l&rsquo;espace de stockage nécessaire et accélère le
              traitement de votre dossier.
            </p>
            <label className="dropzone" style={{ display: 'block', cursor: 'pointer' }}>
              {documentsFileName ? (
                <>
                  Glissez le fichier ici, ou cliquez pour parcourir
                  <br />
                  <strong>{documentsFileName}</strong>
                </>
              ) : (
                'Glissez le fichier PDF ici, ou cliquez pour parcourir'
              )}
              <input
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => setDocumentsFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
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
