'use client';

import { useState } from 'react';
import { createEcole } from '@/lib/admin-ecole-whatsapp-api';

// "+ Ajouter une école" — 11-backoffice-ecole-whatsapp.md. On confirm, the
// new school appears immediately everywhere that reads the Ecole table
// live (this screen's filter row, the public nav dropdown, /ecoles) — no
// further development needed, since none of those hardcode a school list.
export function AddEcoleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [nom, setNom] = useState('');
  const [lien, setLien] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) {
      setError("Le nom de l'école est requis.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createEcole({
        nom: nom.trim(),
        ...(lien.trim() ? { lienWhatsappGeneral: lien.trim() } : {}),
      });
      onCreated();
      onClose();
    } catch {
      setError("Impossible d'ajouter cette école. Vérifiez les informations saisies.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Ajouter une école</h3>
          <button type="button" className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="field">
              <label>Nom de l&rsquo;école / faculté</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. ENEAM" />
            </div>
            <div className="field">
              <label>Lien WhatsApp général (optionnel)</label>
              <input
                value={lien}
                onChange={(e) => setLien(e.target.value)}
                placeholder="https://chat.whatsapp.com/…"
              />
            </div>
            {error && <p className="err-msg">{error}</p>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Ajout…' : "Ajouter l'école"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
