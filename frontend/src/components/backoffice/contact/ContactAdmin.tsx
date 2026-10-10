'use client';

import { useEffect, useState } from 'react';
import { CountryPhoneInput } from '@/components/forms/CountryPhoneInput';
import {
  fetchContactMessages,
  fetchContactSettings,
  updateContactMessageStatut,
  updateContactSettings,
  type ContactMessage,
  type ContactMessageStatut,
} from '@/lib/admin-contact-api';
import { formatWhatsapp, whatsappLink } from '@/lib/contact-display';

const STATUT_FILTERS: { label: string; statut: 'all' | ContactMessageStatut }[] = [
  { label: 'Tous', statut: 'all' },
  { label: 'Nouveaux', statut: 'nouveau' },
  { label: 'Lus', statut: 'lu' },
  { label: 'Traités', statut: 'traite' },
];

const STATUT_LABELS: Record<ContactMessageStatut, string> = {
  nouveau: 'Nouveau',
  lu: 'Lu',
  traite: 'Traité',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ContactAdmin() {
  // ---- coordonnées ----
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ---- messages ----
  const [statut, setStatut] = useState<'all' | ContactMessageStatut>('all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    nouveau: 0,
    lu: 0,
    traite: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchContactSettings().then(({ settings }) => {
      setEmail(settings.email);
      setWhatsapp(settings.whatsapp);
      setSettingsLoaded(true);
    });
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchContactMessages({ statut, ...(q ? { q } : {}) });
      setItems(res.items);
      setCounts(res.counts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statut]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function saveSettings() {
    setSettingsMsg(null);
    setSaving(true);
    try {
      const res = await updateContactSettings({ email: email.trim(), whatsapp });
      setEmail(res.settings.email);
      setWhatsapp(res.settings.whatsapp);
      setSettingsMsg({ ok: true, text: 'Coordonnées enregistrées — à jour partout sur le site.' });
    } catch {
      setSettingsMsg({
        ok: false,
        text: 'Enregistrement impossible : vérifiez l’adresse e-mail et le numéro WhatsApp.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleStatutChange(id: string, next: ContactMessageStatut) {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, statut: next } : m)));
    try {
      await updateContactMessageStatut(id, next);
    } finally {
      void load();
    }
  }

  return (
    <>
      <div>
        <h3 className="bo-h1" style={{ marginBottom: 2 }}>
          Contact &amp; messages
        </h3>
        <div className="bo-sub" style={{ marginBottom: 0 }}>
          Coordonnées affichées sur le site, et messages envoyés depuis le formulaire de la page
          Contact.
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3>Coordonnées affichées sur le site</h3>
        <div className="sub">
          Mises à jour ici, elles changent partout : page Contact, pied de page, page
          Non-affiliation et page de maintenance.
        </div>
        {settingsLoaded ? (
          <>
            <div className="row2">
              <div className="field">
                <label htmlFor="bo-contact-email">E-mail de contact</label>
                <input
                  id="bo-contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="bo-contact-wa">Numéro WhatsApp</label>
                <CountryPhoneInput id="bo-contact-wa" value={whatsapp} onChange={setWhatsapp} />
              </div>
            </div>
            {settingsMsg && (
              <p
                className={settingsMsg.ok ? 'hint' : 'err-msg'}
                style={{
                  marginBottom: 10,
                  ...(settingsMsg.ok ? { color: 'var(--prod-success)' } : {}),
                }}
              >
                {settingsMsg.text}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving || !email.trim()}
              onClick={() => void saveSettings()}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer et propager'}
            </button>
          </>
        ) : (
          <div className="hint">Chargement…</div>
        )}
      </div>

      <h3 style={{ fontSize: 16, marginTop: 28 }}>Messages reçus</h3>

      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Rechercher par nom, e-mail, sujet ou contenu…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
      </div>

      <div className="dossier-filters" style={{ marginTop: 14 }}>
        {STATUT_FILTERS.map((f) => (
          <button
            key={f.statut}
            type="button"
            className={`df-chip${statut === f.statut ? ' on' : ''}`}
            onClick={() => setStatut(f.statut)}
          >
            {f.label}
            <span className="cnt">{counts[f.statut] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="dossier-empty" style={{ marginTop: 16 }}>
          Chargement…
        </div>
      ) : items.length === 0 ? (
        <div className="dossier-empty" style={{ marginTop: 16 }}>
          Aucun message ne correspond à ce filtre.
        </div>
      ) : (
        <div className="contact-inbox">
          {items.map((m) => (
            <div
              key={m.id}
              className={`bo-card contact-msg${m.statut === 'nouveau' ? ' new' : ''}`}
            >
              <div className="contact-msg-head">
                <div style={{ minWidth: 0 }}>
                  <div className="bo-card-title">{m.nom}</div>
                  {m.sujet && <div className="contact-msg-subject">{m.sujet}</div>}
                </div>
                <select
                  value={m.statut}
                  onChange={(e) =>
                    void handleStatutChange(m.id, e.target.value as ContactMessageStatut)
                  }
                >
                  {(Object.keys(STATUT_LABELS) as ContactMessageStatut[]).map((key) => (
                    <option key={key} value={key}>
                      {STATUT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="contact-msg-body">{m.message}</p>
              <div className="contact-msg-meta">
                {m.email && <a href={`mailto:${m.email}`}>✉ {m.email}</a>}
                {m.telephone && (
                  <a href={whatsappLink(m.telephone)} target="_blank" rel="noopener noreferrer">
                    ✆ {formatWhatsapp(m.telephone)}
                  </a>
                )}
                <span className="hint">{formatDateTime(m.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
