// Écran Comptes admin & rôles — docs/design-reference/DESIGN-SPEC.md,
// section "14. Comptes admin & rôles". Table de permissions reproduite à la
// lettre depuis educbenin-prototype.html — les 4 membres et leurs
// permissions par module sont des exemples statiques (aucun modèle de
// permissions par module n'existe encore côté backend, seul le rôle
// ADMIN/SUPERADMIN global existe). "+ Inviter un membre" n'a pas de
// comportement réel dans le prototype — même état ici.

import { ADMIN_MEMBERS as MEMBERS, type AdminPerm } from '@/lib/backoffice-static-data';

const PERM_LABEL: Record<AdminPerm, string> = {
  manage: 'Gérer',
  read: 'Lecture seule',
  none: 'Aucun accès',
};

export default async function ComptesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams).q ?? '').trim().toLowerCase();
  const rows = query ? MEMBERS.filter((m) => m.name.toLowerCase().includes(query)) : MEMBERS;

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h3 className="bo-h1" style={{ marginBottom: 2 }}>
            Comptes admin &amp; rôles
          </h3>
          <div className="bo-sub" style={{ marginBottom: 0 }}>
            Permissions par module, membre par membre.
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-sm">
          + Inviter un membre
        </button>
      </div>

      <div className="tablewrap" style={{ marginTop: 16 }}>
        <table className="dtable">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Dossiers</th>
              <th>Rejetés</th>
              <th>Spéc. &amp; WhatsApp</th>
              <th>Tarifs</th>
              <th>Comptes admin</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="hint">
                  Aucun membre ne correspond à cette recherche.
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.name}>
                  <td>{m.name}</td>
                  {m.perms.map((p, i) => (
                    <td key={i}>
                      <span className={`perm ${p}`}>{PERM_LABEL[p]}</span>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
