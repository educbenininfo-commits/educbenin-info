'use client';

import { useState } from 'react';
import {
  MODULE_KEYS,
  MODULE_LABELS,
  sendInvite,
  fullAccessPermissions,
  supportDefaultPermissions,
  type ModulePermissions,
  type PermLevel,
} from '@/lib/admin-team-api';

type RoleChoice = 'SUPERADMIN' | 'ADMIN' | 'SUPPORT';

const ROLE_OPTIONS: { value: RoleChoice; label: string }[] = [
  { value: 'SUPERADMIN', label: 'Super administrateur' },
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'SUPPORT', label: 'Support' },
];

function defaultsFor(role: RoleChoice): ModulePermissions {
  if (role === 'SUPPORT') return supportDefaultPermissions();
  return fullAccessPermissions();
}

export function InviteMemberModal({
  canInviteSuperadmin,
  onClose,
  onSent,
}: {
  canInviteSuperadmin: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleChoice>('ADMIN');
  const [perms, setPerms] = useState<ModulePermissions>(defaultsFor('ADMIN'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectRole(next: RoleChoice) {
    setRole(next);
    setPerms(defaultsFor(next));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Adresse e-mail requise.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await sendInvite({
        email: email.trim(),
        role: role === 'SUPPORT' ? 'ADMIN' : role,
        ...(role !== 'SUPERADMIN' ? { adminLabel: role === 'SUPPORT' ? 'SUPPORT' : 'ADMIN' } : {}),
        modulePermissions: perms,
      });
      onSent();
    } catch {
      setError("Impossible d'envoyer cette invitation. Vérifiez l'adresse e-mail.");
    } finally {
      setSubmitting(false);
    }
  }

  const gridDisabled = role === 'SUPERADMIN';

  return (
    <div className="overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Inviter un membre</h3>
          <button type="button" className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="field">
              <label>Adresse e-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@educbenin.info"
              />
              <div className="hint">
                Une adresse Gmail permet une connexion directe avec Google après confirmation ;
                toute autre adresse devra définir un mot de passe.
              </div>
            </div>

            <div className="field">
              <label>Rôle</label>
              <div className="chipwrap">
                {ROLE_OPTIONS.filter(
                  (opt) => opt.value !== 'SUPERADMIN' || canInviteSuperadmin,
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`chip${role === opt.value ? ' sel' : ''}`}
                    onClick={() => selectRole(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {!canInviteSuperadmin && (
                <div className="hint" style={{ marginTop: 4 }}>
                  Seul un super administrateur peut inviter un autre super administrateur.
                </div>
              )}
            </div>

            <div className="field">
              <label>Accès par module</label>
              {gridDisabled && (
                <div className="hint" style={{ marginBottom: 6 }}>
                  Un super administrateur a toujours accès à tout — non personnalisable.
                </div>
              )}
              <div style={{ display: 'grid', gap: 8 }}>
                {MODULE_KEYS.map((k) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{MODULE_LABELS[k]}</span>
                    <select
                      value={gridDisabled ? 'manage' : perms[k]}
                      disabled={gridDisabled}
                      onChange={(e) =>
                        setPerms((prev) => ({ ...prev, [k]: e.target.value as PermLevel }))
                      }
                    >
                      <option value="manage">Gérer</option>
                      <option value="read">Lecture seule</option>
                      <option value="none">Aucun accès</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="err-msg">{error}</p>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Envoi…' : "Envoyer l'invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
