'use client';

import { useRef, useState } from 'react';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { createDossier, DossierApiError } from '@/lib/dossiers-public-api';
import { CountryPhoneInput } from '@/components/forms/CountryPhoneInput';
import { UploadHint } from '@/components/forms/UploadHint';

// Generic "Faire ma demande" form for every Categorie added by the
// multi-school extension (Licence/Master/Cycle I/Cycle II, …) — the
// mechanically identical part of screens 06-09: single-filière selection
// (skipped when there's only one option, e.g. INMeS Cycle I) → Nom/Prénom
// /WhatsApp → PDF + 4 consent checkboxes → submit → confirmation panel.
// Posts to the same POST /api/dossiers route as the legacy D.E.S. form
// (components/accompagnement/DemandForm.tsx, untouched — its own
// multi-specialty chip step and Nationalité field are specific to that
// flow and NOT reproduced here per each 06-09 prompt's explicit field
// list).
//
// Unlike the D.E.S. form, filière selection here is single-select (one
// Dossier → one filiereId), per each reference screenshot's "une seule
// sélectionnable" instruction.

export interface FiliereChoice {
  id: string;
  label: string;
}

function formatBytes(bytes: number): string {
  const mo = bytes / (1024 * 1024);
  return `${mo.toFixed(1).replace('.', ',')} Mo`;
}

function submitErrorMessage(err: unknown): string {
  if (err instanceof DossierApiError) {
    switch (err.code) {
      case 'FILE_TOO_LARGE':
        return 'Votre fichier dépasse 5 Mo. Compressez-le (lien ci-dessus) puis réessayez.';
      case 'INVALID_MIME':
      case 'MAGIC_BYTE_MISMATCH':
        return "Ce fichier n'est pas un PDF valide.";
      case 'TIMEOUT':
        return 'La requête a pris trop de temps. Vérifiez votre connexion et réessayez.';
      case 'VALIDATION_FAILED':
        return 'Merci de vérifier vos informations — un champ est probablement mal rempli.';
      default:
        return "Votre demande n'a pas pu être envoyée. Merci de vérifier vos informations et de réessayer.";
    }
  }
  return 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.';
}

type InfoErrors = { nom?: string; prenom?: string; whatsapp?: string };

export function CategoryDemandForm({
  categorieId,
  filiereOptions,
  filiereStepLabel = 'Choisissez votre filière',
  independenceSuffix,
}: {
  categorieId: string;
  filiereOptions: FiliereChoice[];
  filiereStepLabel?: string;
  /** e.g. "la FSS" / "l'INMeS" — completes "…indépendant de {suffix} et de l'UAC." */
  independenceSuffix: string;
}) {
  const hasFiliereStep = filiereOptions.length > 1;

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedFiliereId, setSelectedFiliereId] = useState<string | null>(
    filiereOptions.length === 1 ? filiereOptions[0]!.id : null,
  );
  const [filiereError, setFiliereError] = useState<string | null>(null);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [infoErrors, setInfoErrors] = useState<InfoErrors>({});

  const [file, setFile] = useState<File | null>(null);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [filesErrors, setFilesErrors] = useState<{
    file: string | undefined;
    checks: string | undefined;
  }>({ file: undefined, checks: undefined });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSubmit = file !== null && checks.every(Boolean);

  const infoStepNum = hasFiliereStep ? 2 : 1;
  const filesStepNum = hasFiliereStep ? 3 : 2;

  function goToInfoStep() {
    if (!selectedFiliereId) {
      setFiliereError('Choisissez une filière pour continuer.');
      return;
    }
    setStep(infoStepNum);
  }

  function goToFilesStep() {
    const errors: InfoErrors = {};
    if (!nom.trim()) errors.nom = 'Le nom est requis.';
    if (!prenom.trim()) errors.prenom = 'Le prénom est requis.';
    if (!whatsapp.trim() || !isValidPhoneNumber(whatsapp.trim())) {
      errors.whatsapp = 'Numéro invalide — vérifiez l’indicatif et le format.';
    }
    setInfoErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setStep(filesStepNum);
  }

  function handleFile(f: File | null) {
    setFile(f);
    setFilesErrors((prev) => ({ file: undefined, checks: prev.checks }));
  }

  function toggleCheck(i: number) {
    setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
    setFilesErrors((prev) => ({ file: prev.file, checks: undefined }));
  }

  async function submit() {
    const errors = {
      file: file ? undefined : 'Déposez votre dossier au format PDF.',
      checks: checks.every(Boolean)
        ? undefined
        : 'Les 4 cases doivent être cochées pour continuer.',
    };
    setFilesErrors(errors);
    if (errors.file || errors.checks || !selectedFiliereId) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('nom', nom.trim());
      form.append('prenom', prenom.trim());
      form.append('whatsapp', whatsapp.trim());
      form.append('categorieId', categorieId);
      form.append('filiereId', selectedFiliereId);
      form.append('consent1', String(checks[0]));
      form.append('consent2', String(checks[1]));
      form.append('consent3', String(checks[2]));
      form.append('consent4', String(checks[3]));
      form.append('pdf', file!);

      const res = await createDossier(form);
      setReference(res.reference);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(submitErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="confirm-panel">
        <div className="ok-badge">✓</div>
        <h3>Demande bien reçue</h3>
        <p style={{ color: 'var(--prod-ink-muted)', marginTop: 8, fontSize: 13.5 }}>
          Conservez votre référence de dossier et surveillez votre WhatsApp.
        </p>
        <div className="ref mono">{reference}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="stepper">
        {hasFiliereStep && (
          <>
            <div className={`sp${step === 1 ? ' on' : step > 1 ? ' done' : ''}`}>
              <span className="c">1</span>
              <span className="lbl">Filière</span>
            </div>
            <div className="bar" />
          </>
        )}
        <div className={`sp${step === infoStepNum ? ' on' : step > infoStepNum ? ' done' : ''}`}>
          <span className="c">{infoStepNum}</span>
          <span className="lbl">Vos informations</span>
        </div>
        <div className="bar" />
        <div className={`sp${step === filesStepNum ? ' on' : ''}`}>
          <span className="c">{filesStepNum}</span>
          <span className="lbl">Pièces &amp; envoi</span>
        </div>
      </div>

      {hasFiliereStep && step === 1 && (
        <div className="form-step active">
          <div className="field">
            <label>{filiereStepLabel}</label>
          </div>
          <div className="chipwrap">
            {filiereOptions.map((f) => (
              <div
                key={f.id}
                className={`chip${selectedFiliereId === f.id ? ' sel' : ''}`}
                onClick={() => {
                  setSelectedFiliereId(f.id);
                  setFiliereError(null);
                }}
              >
                {f.label}
              </div>
            ))}
          </div>
          {filiereError && (
            <p className="field err-msg" style={{ marginTop: 10 }}>
              {filiereError}
            </p>
          )}
          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={goToInfoStep}>
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === infoStepNum && (
        <div className="form-step active">
          <div className="row2">
            <div className="field">
              <label>Nom</label>
              <input
                placeholder="AMOUSSOU"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className={infoErrors.nom ? 'err' : ''}
              />
              {infoErrors.nom && <span className="err-msg">{infoErrors.nom}</span>}
            </div>
            <div className="field">
              <label>Prénom</label>
              <input
                placeholder="Koffi"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className={infoErrors.prenom ? 'err' : ''}
              />
              {infoErrors.prenom && <span className="err-msg">{infoErrors.prenom}</span>}
            </div>
          </div>
          <div className="field">
            <label>Numéro WhatsApp</label>
            <CountryPhoneInput
              value={whatsapp}
              onChange={setWhatsapp}
              error={Boolean(infoErrors.whatsapp)}
            />
            {infoErrors.whatsapp ? (
              <span className="err-msg">{infoErrors.whatsapp}</span>
            ) : (
              <span className="hint">Canal utilisé pour tout le suivi de votre dossier.</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {hasFiliereStep ? (
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                Retour
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="btn btn-primary" onClick={goToFilesStep}>
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === filesStepNum && (
        <div className="form-step active">
          <div className="field">
            <label>Pièces à fournir (PDF unique)</label>
            <UploadHint maxMb={5} />
            <div
              className={`dropzone${filesErrors.file ? ' err' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files[0];
                if (dropped) handleFile(dropped);
              }}
            >
              {file ? (
                <>
                  {file.name}
                  <br />
                  <span style={{ fontSize: 11 }}>{formatBytes(file.size)}</span>
                </>
              ) : (
                <>
                  Glissez votre fichier PDF ici, ou cliquez pour parcourir
                  <br />
                  <span style={{ fontSize: 11 }}>Format PDF uniquement</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {filesErrors.file && (
              <span className="err-msg" style={{ marginTop: 4 }}>
                {filesErrors.file}
              </span>
            )}
          </div>
          <div style={{ marginTop: 18 }}>
            {[
              "J'ai pris connaissance des Conditions Générales d'Utilisation et de Vente et je les accepte.",
              'Je consens au traitement de mes données personnelles selon la Politique de confidentialité.',
              "Je certifie l'exactitude des informations fournies et l'authenticité des pièces jointes.",
              `J'ai compris qu'Educ Bénin est indépendant de ${independenceSuffix} et de l'UAC.`,
            ].map((label, i) => (
              <label key={label} className="check-row">
                <input type="checkbox" checked={checks[i]} onChange={() => toggleCheck(i)} />
                <span>{label}</span>
              </label>
            ))}
            {filesErrors.checks && <p className="err-msg">{filesErrors.checks}</p>}
          </div>
          {submitError && (
            <p className="err-msg" style={{ marginTop: 10 }}>
              {submitError}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStep(infoStepNum)}
              disabled={submitting}
            >
              Retour
            </button>
            <button
              type="button"
              className={`btn btn-primary${canSubmit && !submitting ? '' : ' is-disabled'}`}
              disabled={!canSubmit || submitting}
              onClick={submit}
            >
              {submitting ? 'Envoi en cours…' : 'Envoyer ma demande'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
