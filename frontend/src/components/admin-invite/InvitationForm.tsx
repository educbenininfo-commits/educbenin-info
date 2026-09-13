'use client';

// Public "invitation" confirmation page — reached via the link a SUPERADMIN
// sends from Comptes admin & rôles. Two branches on the SAME token,
// distinguished by whether the invited email is Gmail: a Gmail address only
// needs to confirm, then signs in with Google; anything else sets a
// password here and then logs in normally. See AdminInvite's schema.prisma
// comment for why the User row is only created/promoted at confirm time,
// not when the invite is sent.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchInviteState,
  confirmInvite,
  InviteApiError,
  type InviteTokenState,
} from '@/lib/admin-invite-public-api';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';

type ViewState = 'loading' | 'ready' | 'done' | { valid: false; error: string };

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  INVITE_INVALID: {
    title: 'Lien invalide',
    body: "Ce lien d'invitation n'est pas reconnu. Contactez la personne qui vous a invité(e).",
  },
  INVITE_EXPIRED: {
    title: 'Lien expiré',
    body: "Ce lien d'invitation a expiré (validité de 10 minutes). Demandez un nouvel envoi à un super administrateur.",
  },
  INVITE_ALREADY_CONSUMED: {
    title: 'Invitation déjà utilisée',
    body: 'Cette invitation a déjà été confirmée. Rendez-vous directement sur la page de connexion.',
  },
};

function BareHeader() {
  return (
    <div className="nav-bleed">
      <div className="p-nav pw" style={{ justifyContent: 'center' }}>
        <Link href="/" className="p-logo">
          <EducBeninLogo height={32} />
        </Link>
      </div>
    </div>
  );
}

function MessageScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="prod">
      <BareHeader />
      <div className="page-head pw">
        <div className="k">Invitation back-office</div>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
    </div>
  );
}

const PASSWORD_MIN = 10;

export function InvitationForm({ token }: { token: string }) {
  const [view, setView] = useState<ViewState>('loading');
  const [inviteInfo, setInviteInfo] = useState<{ email: string; isGmail: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result: InviteTokenState = await fetchInviteState(token);
      if (cancelled) return;
      if (result.valid) {
        setInviteInfo({ email: result.email, isGmail: result.isGmail });
        setView('ready');
      } else {
        setView(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleConfirmGmail() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await confirmInvite(token);
      setView('done');
    } catch (err) {
      setSubmitError(
        err instanceof InviteApiError
          ? 'Impossible de confirmer cette invitation. Elle a peut-être expiré entre-temps.'
          : 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetPassword() {
    if (password.length < PASSWORD_MIN) {
      setSubmitError(`Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`);
      return;
    }
    if (password !== passwordConfirm) {
      setSubmitError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await confirmInvite(token, password);
      setView('done');
    } catch (err) {
      setSubmitError(
        err instanceof InviteApiError
          ? err.code === 'PASSWORD_BANNED'
            ? 'Ce mot de passe est trop courant, choisissez-en un autre.'
            : err.code === 'PASSWORD_PWNED'
              ? 'Ce mot de passe est apparu dans une fuite de données connue, choisissez-en un autre.'
              : "Impossible de finaliser l'invitation. Elle a peut-être expiré entre-temps."
          : 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (view === 'loading') {
    return (
      <div className="prod" style={{ minHeight: '100vh' }}>
        <BareHeader />
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '80px 24px',
            color: 'var(--prod-ink-muted)',
            fontSize: 13.5,
          }}
        >
          Vérification du lien…
        </div>
      </div>
    );
  }

  if (view !== 'ready' && view !== 'done' && 'error' in view) {
    const copy = ERROR_COPY[view.error] ?? ERROR_COPY.INVITE_INVALID!;
    return <MessageScreen title={copy.title} body={copy.body} />;
  }

  if (view === 'done') {
    return (
      <div className="prod">
        <BareHeader />
        <div className="page-head pw">
          <div className="k">Invitation back-office</div>
          <h1>Invitation confirmée</h1>
          <p>Votre accès au back-office Educ Bénin est actif.</p>
          <Link href="/connexion" className="btn btn-primary" style={{ marginTop: 16 }}>
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  // view === 'ready'
  const isGmail = inviteInfo?.isGmail ?? false;

  return (
    <div className="prod">
      <BareHeader />
      <div className="page-head pw">
        <div className="k">Invitation back-office</div>
        <h1>Confirmer votre invitation</h1>
        <p>
          Vous avez été invité(e) à rejoindre le back-office Educ Bénin
          {inviteInfo ? ` (${inviteInfo.email})` : ''}.
        </p>
      </div>

      <div className="section pw">
        <div className="doc-card">
          {isGmail ? (
            <>
              <p>
                Confirmez votre invitation ci-dessous, puis connectez-vous directement avec votre
                compte Google.
              </p>
              {submitError && <p className="err-msg">{submitError}</p>}
              <button
                type="button"
                className={`btn btn-primary btn-block${submitting ? ' is-disabled' : ''}`}
                disabled={submitting}
                style={{ marginTop: 16 }}
                onClick={handleConfirmGmail}
              >
                {submitting ? 'Confirmation…' : "Confirmer l'invitation"}
              </button>
            </>
          ) : (
            <>
              <div className="field">
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <div className="hint">Au moins {PASSWORD_MIN} caractères.</div>
              </div>
              <div className="field">
                <label>Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {submitError && <p className="err-msg">{submitError}</p>}
              <button
                type="button"
                className={`btn btn-primary btn-block${submitting ? ' is-disabled' : ''}`}
                disabled={submitting}
                style={{ marginTop: 16 }}
                onClick={handleSetPassword}
              >
                {submitting ? 'Validation…' : 'Définir mon mot de passe et confirmer'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
