'use client';

// Écran Connexion — docs/design-reference/DESIGN-SPEC.md, section
// "8. Connexion". Layout reproduit à la lettre depuis
// educbenin-prototype.html. The prototype's two buttons just navigate to
// the dashboard with zero validation — the doc itself flags this as
// something "le produit réel devra bien sûr implémenter" — per product
// decision this session, this form calls the starter's real
// /api/auth/login (and the Google button links to the real OAuth start
// route). Demo values ("agent@educbenin.bj" / dots) are shown as
// placeholders, not pre-filled values — same "real blank form" principle
// applied throughout the public screens.

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const DASHBOARD_PATH = '/admin/tableau-de-bord';
const googleSignInHref = `/api/auth/oauth/google/start?next=${DASHBOARD_PATH}`;

export default function ConnexionPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ csrfToken?: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      await refresh();
      router.push(DASHBOARD_PATH);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inconnue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="prod login-grid">
      <div
        style={{
          background: 'linear-gradient(165deg, var(--prod-primary-dark), var(--prod-primary))',
          color: '#fff',
          padding: 44,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div className="p-logo" style={{ color: '#fff' }}>
          <span className="mark" style={{ background: 'rgba(255,255,255,.18)' }}>
            EB
          </span>
          Educ Bénin
        </div>
        <div>
          <div className="eyebrow" style={{ color: '#F4D98A' }}>
            Espace back-office
          </div>
          <h2 style={{ fontSize: 24, color: '#fff', lineHeight: 1.3 }}>
            Le poste de pilotage des dossiers de probatoire.
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,.75)',
              marginTop: 10,
              fontSize: 13.5,
              maxWidth: '36ch',
            }}
          >
            Réservé aux membres de l&rsquo;équipe Educ Bénin.
          </p>
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)' }}>
          Accès nominatif · permissions par module
        </div>
      </div>

      <div style={{ padding: 52, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
          <h3 style={{ fontSize: 20, marginBottom: 22 }}>Connexion</h3>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Adresse e-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="agent@educbenin.bj"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="field err-msg" style={{ marginBottom: 16 }}>
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
          <div className="divider">ou</div>
          <a href={googleSignInHref} className="g-btn">
            <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"
              />
            </svg>
            Se connecter avec Google
          </a>
          <p
            style={{
              fontSize: 11.5,
              color: 'var(--prod-ink-faint)',
              marginTop: 18,
              textAlign: 'center',
            }}
          >
            Mot de passe oublié ? Contactez un administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}
