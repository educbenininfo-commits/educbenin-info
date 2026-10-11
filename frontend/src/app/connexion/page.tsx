'use client';

// Écran Connexion — docs/design-reference/DESIGN-SPEC.md, section
// "8. Connexion". Layout reproduit à la lettre depuis
// educbenin-prototype.html. The prototype's two buttons just navigate to
// the dashboard with zero validation — the doc itself flags this as
// something "le produit réel devra bien sûr implémenter" — per product
// decision this session, this form calls the starter's real
// /api/auth/login (and the Google button links to the real OAuth start
// route). Demo values ("agent@educbenin.info" / dots) are shown as
// placeholders, not pre-filled values — same "real blank form" principle
// applied throughout the public screens.

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';

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
    <div className="prod auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <EducBeninLogo height={38} />
        </div>
        <h1>Connexion</h1>
        <p className="auth-sub">Accédez au back-office de l&rsquo;équipe Educ Bénin</p>

        <a href={googleSignInHref} className="g-btn">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
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
          Continuer avec Google
        </a>
        <div className="divider">ou</div>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="login-email">
              E-mail <span className="req">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="vous@educbenin.info"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">
              Mot de passe <span className="req">*</span>
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="err-msg" style={{ marginBottom: 14 }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="auth-foot">Mot de passe oublié ? Contactez un administrateur.</p>
      </div>
    </div>
  );
}
