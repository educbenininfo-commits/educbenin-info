'use client';

import { useState } from 'react';
import { CountryPhoneInput } from '@/components/forms/CountryPhoneInput';
import { createContactMessage, ContactApiError } from '@/lib/contact-public-api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CountryPhoneInput emits "+229" alone for an empty field — treat a bare
  // dial code as "no number".
  const phoneDigits = telephone.replace(/\D/g, '');
  const hasPhone = phoneDigits.length > 4;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !message.trim()) {
      setError('Merci d’indiquer votre nom et votre message.');
      return;
    }
    if (!email.trim() && !hasPhone) {
      setError(
        'Indiquez au moins un e-mail ou un numéro WhatsApp pour que nous puissions vous répondre.',
      );
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setError('Cette adresse e-mail ne semble pas valide.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createContactMessage({
        nom: nom.trim(),
        message: message.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(hasPhone ? { telephone } : {}),
        ...(sujet.trim() ? { sujet: sujet.trim() } : {}),
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ContactApiError && err.status === 429
          ? 'Trop de messages envoyés. Réessayez un peu plus tard.'
          : err instanceof ContactApiError
            ? 'Impossible d’envoyer votre message. Vérifiez vos informations et réessayez.'
            : 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="confirm-panel">
        <div className="ok-badge">✓</div>
        <h3>Message bien reçu</h3>
        <p style={{ color: 'var(--prod-ink-muted)', marginTop: 8, fontSize: 13.5 }}>
          Merci ! Notre équipe vous répondra dès que possible.
        </p>
      </div>
    );
  }

  return (
    <div className="doc-card">
      <h3>Écrivez-nous</h3>
      <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'grid', gap: 14 }}>
        <div className="field">
          <label htmlFor="contact-nom">Nom</label>
          <input
            id="contact-nom"
            placeholder="Votre nom complet"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="contact-email">E-mail</label>
            <input
              id="contact-email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-tel">Numéro WhatsApp</label>
            <CountryPhoneInput id="contact-tel" value={telephone} onChange={setTelephone} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="contact-sujet">Sujet (optionnel)</label>
          <input
            id="contact-sujet"
            placeholder="Ex. : Question sur mon dossier"
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            rows={6}
            placeholder="Votre message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        {error && <p className="err-msg">{error}</p>}
        <div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Envoi…' : 'Envoyer mon message'}
          </button>
        </div>
      </form>
    </div>
  );
}
