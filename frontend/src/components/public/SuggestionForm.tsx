'use client';

import { useState } from 'react';
import { createSuggestion, SuggestionApiError } from '@/lib/suggestions-public-api';

// "Suggérer" form (site copy always says "Suggérer"/"Suggestions", never
// "Signaler"/"Signalements" — CLAUDE.md "Extension multi-écoles"). Shared
// so both the École — INMeS page (04-ecole-inmes.md) and the future home
// page suggestion section (15-wording-suggerer.md) post to the same
// backend without duplicating the form.
export function SuggestionForm({
  title = 'Suggérer une filière',
  rechercheLabel = 'Cycle / filière',
  recherchePlaceholder = 'Ex. : Cycle I — Sciences Infirmières',
  confirmationSubtext = 'Merci ! Nous reviendrons vers vous si la filière est ajoutée.',
  companionText,
  id,
}: {
  title?: string;
  rechercheLabel?: string;
  recherchePlaceholder?: string;
  confirmationSubtext?: string;
  companionText?: string;
  id?: string;
}) {
  const [nom, setNom] = useState('');
  const [contact, setContact] = useState('');
  const [recherche, setRecherche] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !contact.trim() || !recherche.trim()) {
      setError('Merci de remplir les 3 champs.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createSuggestion({
        nom: nom.trim(),
        contact: contact.trim(),
        recherche: recherche.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof SuggestionApiError
          ? "Impossible d'envoyer votre suggestion. Vérifiez vos informations et réessayez."
          : 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div id={id} className="confirm-panel">
        <div className="ok-badge">✓</div>
        <h3>Suggestion bien reçue</h3>
        <p style={{ color: 'var(--prod-ink-muted)', marginTop: 8, fontSize: 13.5 }}>
          {confirmationSubtext}
        </p>
      </div>
    );
  }

  return (
    <div id={id} style={{ display: 'grid', gap: 16 }} className="two-col">
      <div className="doc-card">
        <h3>{title}</h3>
        <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'grid', gap: 14 }}>
          <div className="field">
            <label>Nom</label>
            <input
              placeholder="Votre nom complet"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Contact (WhatsApp ou e-mail)</label>
            <input
              placeholder="+229 97 00 00 00"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{rechercheLabel}</label>
            <input
              placeholder={recherchePlaceholder}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          {error && <p className="err-msg">{error}</p>}
          <div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Envoi…' : 'Envoyer ma suggestion'}
            </button>
          </div>
        </form>
      </div>
      {companionText && (
        <div className="callout info" style={{ alignSelf: 'start' }}>
          <span className="icn">ⓘ</span>
          <span>{companionText}</span>
        </div>
      )}
    </div>
  );
}
