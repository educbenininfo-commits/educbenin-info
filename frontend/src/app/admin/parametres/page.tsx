'use client';

// Écran Paramètres — docs/design-reference/DESIGN-SPEC.md, section
// "15. Paramètres". Layout reproduit à la lettre depuis
// educbenin-prototype.html. Per product decision this session: E-mail
// shows the real logged-in admin's address (consistent with the rest of
// the back-office, which already shows real session data) instead of the
// prototype's fictional "chimene@educbenin.info"; Nom complet stays blank —
// `User.name` exists in Prisma but no route exposes or lets it be written
// yet, so there's nothing real to show. "Enregistrer les modifications"
// stays inert, matching the prototype (no profile-update endpoint exists).
// "Se déconnecter" calls the real logout, unlike the prototype's plain
// navigation — same treatment as every other back-office logout entry
// point this session.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';

interface SessionRow {
  id: string;
  device: string;
  location: string | null;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
}

function formatSessionTime(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} à ${hh}:${min}`;
}

export default function ParametresPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const admin = useBackofficeAdmin();

  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  async function loadSessions() {
    try {
      const res = await api<{ sessions: SessionRow[] }>('/api/auth/sessions');
      setSessions(res.sessions);
    } catch {
      setSessionsError('Impossible de charger les sessions actives.');
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function handleLogout() {
    await logout();
    router.push('/connexion');
  }

  async function handleRevoke(id: string) {
    setSessionsError(null);
    setRevokingId(id);
    try {
      const res = await api<{ ok: true; loggedOutThisDevice: boolean }>(
        `/api/auth/sessions/${id}/revoke`,
        { method: 'POST' },
      );
      if (res.loggedOutThisDevice) {
        router.push('/connexion');
        return;
      }
      await loadSessions();
    } catch {
      setSessionsError('Impossible de déconnecter cette session.');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <>
      <h3 className="bo-h1">Paramètres</h3>
      <div className="bo-sub">Profil et session</div>

      <div className="panel" style={{ maxWidth: 420 }}>
        <div className="field">
          <label>Nom complet</label>
          <input placeholder="Nom complet" defaultValue="" />
        </div>
        <div className="field">
          <label>E-mail</label>
          <input defaultValue={admin.email} />
        </div>
        <div className="field">
          <label>Nouveau mot de passe</label>
          <input type="password" placeholder="••••••••" />
        </div>
        <button type="button" className="btn btn-outline btn-block" style={{ marginBottom: 10 }}>
          Enregistrer les modifications
        </button>
        <button type="button" className="btn btn-danger-outline btn-block" onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>

      <div className="panel" style={{ maxWidth: 560, marginTop: 18 }}>
        <h3>Sessions actives</h3>
        <div className="sub">Appareils actuellement connectés à ce compte.</div>

        {sessionsError && (
          <p className="err-msg" style={{ marginBottom: 10 }}>
            {sessionsError}
          </p>
        )}

        {sessions === null ? (
          <p className="hint">Chargement…</p>
        ) : sessions.length === 0 ? (
          <p className="hint">Aucune session active.</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="alert-row"
              style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
            >
              <span>
                {s.device}
                {s.current && (
                  <span className="pill ok" style={{ marginLeft: 8 }}>
                    Cet appareil
                  </span>
                )}
                <br />
                <span style={{ fontSize: 11.5, color: 'var(--prod-ink-faint)' }}>
                  {s.location ?? 'Localisation inconnue'} · Dernière activité{' '}
                  {formatSessionTime(s.lastSeenAt)}
                </span>
              </span>
              <button
                type="button"
                className={`btn btn-outline btn-sm${revokingId === s.id ? ' is-disabled' : ''}`}
                disabled={revokingId === s.id}
                onClick={() => void handleRevoke(s.id)}
              >
                {revokingId === s.id
                  ? 'Déconnexion…'
                  : s.current
                    ? 'Déconnecter cet appareil'
                    : 'Déconnecter'}
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
