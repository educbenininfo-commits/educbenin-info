'use client';

// Écran Paramètres — docs/design-reference/DESIGN-SPEC.md, section
// "15. Paramètres". Layout reproduit à la lettre depuis
// educbenin-prototype.html. Per product decision this session: E-mail
// shows the real logged-in admin's address (consistent with the rest of
// the back-office, which already shows real session data) instead of the
// prototype's fictional "chimene@educbenin.bj"; Nom complet stays blank —
// `User.name` exists in Prisma but no route exposes or lets it be written
// yet, so there's nothing real to show. "Enregistrer les modifications"
// stays inert, matching the prototype (no profile-update endpoint exists).
// "Se déconnecter" calls the real logout, unlike the prototype's plain
// navigation — same treatment as every other back-office logout entry
// point this session.

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';

export default function ParametresPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const admin = useBackofficeAdmin();

  async function handleLogout() {
    await logout();
    router.push('/connexion');
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
    </>
  );
}
