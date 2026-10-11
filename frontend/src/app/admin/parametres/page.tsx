'use client';

// Écran Paramètres — « Mon profil » : carte de profil, informations
// personnelles (nom affiché modifiable via /api/admin/profile ; e-mail de
// connexion et rôle en lecture seule), sécurité (mot de passe, autres
// appareils, session actuelle), affichage du menu mobile et liste des
// sessions actives. Pas de « zone dangereuse » (suppression de compte) :
// un membre de l'équipe ne supprime pas son propre accès ici — c'est géré
// depuis « Comptes admin & rôles », qui protège le dernier super-admin.

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  LaptopMinimal,
  LogOut,
  MonitorSmartphone,
  PanelBottom,
  PanelLeft,
  ShieldCheck,
  Smartphone,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';
import { setBoNavMode, useBoNavMode } from '@/lib/bo-nav-mode';

interface SessionRow {
  id: string;
  device: string;
  location: string | null;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
}

interface Profile {
  name: string | null;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  createdAt: string;
}

const SESSIONS_PREVIEW = 5;

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super-administrateur',
  ADMIN: 'Administrateur',
};

const PASSWORD_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: 'Mot de passe actuel incorrect.',
  PASSWORD_TOO_SHORT: 'Le nouveau mot de passe doit contenir au moins 10 caractères.',
  PASSWORD_BANNED: 'Ce mot de passe est trop courant — choisissez-en un autre.',
  PASSWORD_PWNED:
    'Ce mot de passe figure dans une fuite de données connue — choisissez-en un autre.',
  LOCKED_OUT: 'Trop de tentatives. Réessayez dans quelques minutes.',
};

function formatSessionTime(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} à ${hh}:${min}`;
}

function initials(label: string): string {
  const parts = label
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function SecurityRow({
  icon: Icon,
  title,
  desc,
  chip = '',
  children,
}: {
  icon: LucideIcon;
  title: string;
  desc: React.ReactNode;
  chip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sec-row">
      <span className={`icon-chip ${chip}`}>
        <Icon />
      </span>
      <div className="sec-text">
        <strong>{title}</strong>
        <span>{desc}</span>
      </div>
      <div className="sec-action">{children}</div>
    </div>
  );
}

export default function ParametresPage() {
  const navMode = useBoNavMode();
  const router = useRouter();
  const { logout, user } = useAuth();
  const admin = useBackofficeAdmin();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const hasPassword = user?.hasPassword ?? true;
  const displayName = profile?.name || admin.email.split('@')[0] || admin.email;
  const others = (sessions ?? []).filter((s) => !s.current);

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
    void api<{ profile: Profile }>('/api/admin/profile')
      .then(({ profile: p }) => {
        setProfile(p);
        setName(p.name ?? '');
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await logout();
    router.push('/connexion');
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    setSavingName(true);
    try {
      const res = await api<{ profile: Profile }>('/api/admin/profile', {
        method: 'PATCH',
        body: { name: name.trim() },
      });
      setProfile(res.profile);
      setName(res.profile.name ?? '');
      setNameMsg({ ok: true, text: 'Profil enregistré.' });
    } catch {
      setNameMsg({ ok: false, text: 'Enregistrement impossible. Réessayez.' });
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: 'Les deux nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    setPwSaving(true);
    try {
      if (hasPassword) {
        await api('/api/auth/change-password', {
          method: 'POST',
          body: { currentPassword: pw.current, newPassword: pw.next },
        });
      } else {
        await api('/api/auth/set-password', { method: 'POST', body: { newPassword: pw.next } });
      }
      setPw({ current: '', next: '', confirm: '' });
      setPwOpen(false);
      setPwMsg({
        ok: true,
        text: 'Mot de passe mis à jour. Les autres appareils devront se reconnecter.',
      });
      void loadSessions();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      setPwMsg({ ok: false, text: PASSWORD_ERRORS[code] ?? 'Modification impossible. Réessayez.' });
    } finally {
      setPwSaving(false);
    }
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

  async function revokeOthers() {
    setSessionsError(null);
    setRevokingId('others');
    try {
      for (const s of others) {
        await api(`/api/auth/sessions/${s.id}/revoke`, { method: 'POST' });
      }
      await loadSessions();
    } catch {
      setSessionsError('Impossible de déconnecter tous les autres appareils.');
      await loadSessions();
    } finally {
      setRevokingId(null);
    }
  }

  const memberSince = profile
    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <>
      <div className="bo-page-head">
        <div>
          <h3 className="bo-h1">Mon profil</h3>
          <div className="bo-sub">Profil, sécurité, affichage et sessions de votre compte.</div>
        </div>
      </div>

      <div className="settings-wrap">
        <div className="panel profile-card">
          <div className="avatar-lg" aria-hidden="true">
            {initials(profile?.name || admin.email)}
          </div>
          <div className="profile-id">
            <strong>{displayName}</strong>
            <span>{admin.email}</span>
            <div className="profile-badges">
              <span className={`pill ${admin.role === 'SUPERADMIN' ? 'accent' : ''}`}>
                {ROLE_LABELS[admin.role] ?? admin.role}
              </span>
              {user?.linkedProviders.includes('google') && <span className="pill">Google</span>}
              {memberSince && <span className="hint">Membre depuis {memberSince}</span>}
            </div>
          </div>
        </div>

        <form className="panel" onSubmit={saveName}>
          <h3>
            <span className="icon-chip">
              <UserRound />
            </span>
            Informations personnelles
          </h3>
          <div className="sub">Le nom affiché dans le back-office et l&rsquo;historique.</div>
          <div className="row2">
            <div className="field">
              <label htmlFor="pf-name">Nom complet</label>
              <input
                id="pf-name"
                value={name}
                maxLength={80}
                placeholder="Ex. Chimène Adjovi"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="pf-email">E-mail de connexion</label>
              <input id="pf-email" value={admin.email} readOnly disabled />
            </div>
          </div>
          <p className="hint" style={{ marginTop: 0 }}>
            L&rsquo;e-mail et le rôle se gèrent depuis « Comptes admin &amp; rôles ».
          </p>
          {nameMsg && (
            <p
              className={nameMsg.ok ? 'hint' : 'err-msg'}
              style={nameMsg.ok ? { color: 'var(--prod-success)' } : undefined}
            >
              {nameMsg.text}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={savingName || !profile || name.trim() === (profile.name ?? '')}
          >
            {savingName ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>

        <div className="panel">
          <h3>
            <span className="icon-chip success">
              <ShieldCheck />
            </span>
            Sécurité
          </h3>
          <div className="sub">Protégez l&rsquo;accès à votre compte.</div>

          <SecurityRow
            icon={KeyRound}
            title="Mot de passe"
            desc={
              hasPassword
                ? 'Changez-le régulièrement et ne le réutilisez pas ailleurs.'
                : 'Vous vous connectez avec Google — ajoutez un mot de passe en secours.'
            }
          >
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setPwOpen((o) => !o);
                setPwMsg(null);
              }}
            >
              {pwOpen ? 'Annuler' : hasPassword ? 'Modifier' : 'Définir'}
            </button>
          </SecurityRow>
          {pwOpen && (
            <form className="sec-form" onSubmit={savePassword}>
              {hasPassword && (
                <div className="field">
                  <label htmlFor="pw-current">Mot de passe actuel</label>
                  <input
                    id="pw-current"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={pw.current}
                    onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  />
                </div>
              )}
              <div className="row2">
                <div className="field">
                  <label htmlFor="pw-next">Nouveau mot de passe</label>
                  <input
                    id="pw-next"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    required
                    value={pw.next}
                    onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="pw-confirm">Confirmer</label>
                  <input
                    id="pw-confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    required
                    value={pw.confirm}
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  />
                </div>
              </div>
              <p className="hint" style={{ marginTop: 0 }}>
                10 caractères minimum. Les autres appareils seront déconnectés.
              </p>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving}>
                {pwSaving ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          )}
          {pwMsg && (
            <p
              className={pwMsg.ok ? 'hint' : 'err-msg'}
              style={pwMsg.ok ? { color: 'var(--prod-success)' } : undefined}
            >
              {pwMsg.text}
            </p>
          )}

          <SecurityRow
            icon={Smartphone}
            title="Double authentification"
            desc="Un code supplémentaire à chaque connexion."
            chip="violet"
          >
            <span className="pill">Bientôt</span>
          </SecurityRow>

          <SecurityRow
            icon={MonitorSmartphone}
            title="Autres appareils"
            desc={
              sessions === null
                ? 'Chargement…'
                : others.length === 0
                  ? 'Aucun autre appareil connecté.'
                  : `${others.length} autre(s) appareil(s) connecté(s) à ce compte.`
            }
            chip="gold"
          >
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={others.length === 0 || revokingId !== null}
              onClick={() => void revokeOthers()}
            >
              {revokingId === 'others' ? 'Déconnexion…' : 'Déconnecter'}
            </button>
          </SecurityRow>

          <SecurityRow
            icon={LaptopMinimal}
            title="Session actuelle"
            desc="Vous êtes connecté sur cet appareil."
            chip="danger"
          >
            <button type="button" className="btn btn-danger-outline btn-sm" onClick={handleLogout}>
              <LogOut size={15} /> Déconnexion
            </button>
          </SecurityRow>
        </div>

        <div className="panel">
          <h3>
            <span className="icon-chip violet">
              <PanelLeft />
            </span>
            Affichage
          </h3>
          <div className="sub">
            Navigation sur téléphone et petite tablette — mémorisée sur cet appareil.
          </div>
          <div className="choice-grid" role="radiogroup" aria-label="Menu sur mobile">
            <button
              type="button"
              role="radio"
              aria-checked={navMode === 'bottom'}
              className={`choice-card${navMode === 'bottom' ? ' on' : ''}`}
              onClick={() => setBoNavMode('bottom')}
            >
              <PanelBottom size={22} />
              <strong>Menu du bas</strong>
              <span>Barre flottante en bas de l&rsquo;écran, avec un bouton Menu.</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={navMode === 'side'}
              className={`choice-card${navMode === 'side' ? ' on' : ''}`}
              onClick={() => setBoNavMode('side')}
            >
              <PanelLeft size={22} />
              <strong>Menu latéral</strong>
              <span>Bouton ☰ en haut à gauche qui ouvre le menu complet sur le côté.</span>
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>
            <span className="icon-chip gold">
              <MonitorSmartphone />
            </span>
            Sessions actives
          </h3>
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
            (showAllSessions ? sessions : sessions.slice(0, SESSIONS_PREVIEW)).map((s) => (
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
                  disabled={revokingId !== null}
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
          {sessions && sessions.length > SESSIONS_PREVIEW && (
            <button
              type="button"
              className="btn btn-soft btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => setShowAllSessions((v) => !v)}
            >
              {showAllSessions ? 'Afficher moins' : `Afficher les ${sessions.length} sessions`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
