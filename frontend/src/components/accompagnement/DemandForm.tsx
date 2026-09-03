'use client';

import { useRef, useState } from 'react';
import { SPECIALTIES } from '@/lib/specialties';

// Multi-step "Faire ma demande" form — DESIGN-SPEC.md section "2. Accompagnement
// & demande" + educbenin-prototype.html (#stepper / .form-step / #confirmPanel).
// The prototype implements no field validation and ships an already-filled
// example (pre-checked boxes, a pre-attached file) — per explicit product
// decision this session, the real form starts blank (unchecked boxes, no
// file) and gates each step behind validation the prototype left undefined.

const WHATSAPP_RE = /^\+229\s?(\d{2}\s?){4}$/;

function formatBytes(bytes: number): string {
  const mo = bytes / (1024 * 1024);
  return `${mo.toFixed(1).replace('.', ',')} Mo`;
}

type Step2Errors = { nom?: string; prenom?: string; whatsapp?: string };

export function DemandForm() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 — la toute première spécialité est pré-sélectionnée au chargement
  // (comportement fonctionnel explicite du prototype, pas une donnée d'exemple).
  const [selectedCodes, setSelectedCodes] = useState<string[]>([SPECIALTIES[0]!.code]);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});

  // Step 3
  const [file, setFile] = useState<File | null>(null);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [step3Errors, setStep3Errors] = useState<{
    file: string | undefined;
    checks: string | undefined;
  }>({ file: undefined, checks: undefined });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleChip(code: string) {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
    setStep1Error(null);
  }

  function goToStep2() {
    if (selectedCodes.length < 1) {
      setStep1Error('Choisissez au moins une spécialité pour continuer.');
      return;
    }
    setStep(2);
  }

  function goToStep3() {
    const errors: Step2Errors = {};
    if (!nom.trim()) errors.nom = 'Le nom est requis.';
    if (!prenom.trim()) errors.prenom = 'Le prénom est requis.';
    if (!WHATSAPP_RE.test(whatsapp.trim())) {
      errors.whatsapp = 'Format attendu : +229 XX XX XX XX.';
    }
    setStep2Errors(errors);
    if (Object.keys(errors).length > 0) return;
    setStep(3);
  }

  function handleFile(f: File | null) {
    setFile(f);
    setStep3Errors((prev) => ({ file: undefined, checks: prev.checks }));
  }

  function toggleCheck(i: number) {
    setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
    setStep3Errors((prev) => ({ file: prev.file, checks: undefined }));
  }

  function submit() {
    const errors: { file: string | undefined; checks: string | undefined } = {
      file: file ? undefined : 'Déposez votre dossier au format PDF.',
      checks: checks.every(Boolean)
        ? undefined
        : 'Les 4 cases doivent être cochées pour continuer.',
    };
    setStep3Errors(errors);
    if (errors.file || errors.checks) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="confirm-panel">
        <div className="ok-badge">✓</div>
        <h3>Demande bien reçue</h3>
        <p style={{ color: 'var(--prod-ink-muted)', marginTop: 8, fontSize: 13.5 }}>
          Conservez votre référence de dossier et surveillez votre WhatsApp.
        </p>
        <div className="ref mono">EB-2026-000482</div>
      </div>
    );
  }

  return (
    <div>
      <div className="stepper">
        <div className={`sp${step === 1 ? ' on' : step > 1 ? ' done' : ''}`}>
          <span className="c">1</span>
          <span className="lbl">Spécialité(s)</span>
        </div>
        <div className="bar" />
        <div className={`sp${step === 2 ? ' on' : step > 2 ? ' done' : ''}`}>
          <span className="c">2</span>
          <span className="lbl">Vos informations</span>
        </div>
        <div className="bar" />
        <div className={`sp${step === 3 ? ' on' : ''}`}>
          <span className="c">3</span>
          <span className="lbl">Pièces &amp; envoi</span>
        </div>
      </div>

      {step === 1 && (
        <div className="form-step active">
          <div className="field">
            <label>Choisissez une ou plusieurs spécialités</label>
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
          {step1Error && (
            <p className="field err-msg" style={{ marginTop: 10 }}>
              {step1Error}
            </p>
          )}
          {selectedCodes.length > 1 && (
            <div className="callout warn" style={{ marginTop: 16 }}>
              <span className="icn">⚠</span>
              <span>
                Vous avez sélectionné plusieurs spécialités : préparez une demande au Doyen et une
                lettre au Vice-Recteur <strong>pour chacune</strong>.
              </span>
            </div>
          )}
          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={goToStep2}>
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-step active">
          <div className="row2">
            <div className="field">
              <label>Nom</label>
              <input
                placeholder="AMOUSSOU"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className={step2Errors.nom ? 'err' : ''}
              />
              {step2Errors.nom && <span className="err-msg">{step2Errors.nom}</span>}
            </div>
            <div className="field">
              <label>Prénom</label>
              <input
                placeholder="Koffi"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className={step2Errors.prenom ? 'err' : ''}
              />
              {step2Errors.prenom && <span className="err-msg">{step2Errors.prenom}</span>}
            </div>
          </div>
          <div className="field">
            <label>Numéro WhatsApp</label>
            <input
              placeholder="+229 97 00 00 00"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={step2Errors.whatsapp ? 'err' : ''}
            />
            {step2Errors.whatsapp ? (
              <span className="err-msg">{step2Errors.whatsapp}</span>
            ) : (
              <span className="hint">Canal utilisé pour tout le suivi de votre dossier.</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
              Retour
            </button>
            <button type="button" className="btn btn-primary" onClick={goToStep3}>
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="form-step active">
          <div className="field">
            <label>Pièces à fournir (PDF unique)</label>
            <div
              className={`dropzone${step3Errors.file ? ' err' : ''}`}
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
            {step3Errors.file && (
              <span className="err-msg" style={{ marginTop: 4 }}>
                {step3Errors.file}
              </span>
            )}
          </div>
          <div style={{ marginTop: 18 }}>
            {[
              "J'ai pris connaissance des Conditions Générales d'Utilisation et de Vente et je les accepte.",
              'Je consens au traitement de mes données personnelles selon la Politique de confidentialité.',
              "Je certifie l'exactitude des informations fournies et l'authenticité des pièces jointes.",
              "J'ai compris qu'Educ Bénin est indépendant de la FSS et de l'UAC.",
            ].map((label, i) => (
              <label key={label} className="check-row">
                <input type="checkbox" checked={checks[i]} onChange={() => toggleCheck(i)} />
                <span>{label}</span>
              </label>
            ))}
            {step3Errors.checks && <p className="err-msg">{step3Errors.checks}</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
              Retour
            </button>
            <button type="button" className="btn btn-primary" onClick={submit}>
              Envoyer ma demande
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
