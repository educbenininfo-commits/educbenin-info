// Écran Comptes admin & rôles — docs/design-reference/DESIGN-SPEC.md,
// section "14. Comptes admin & rôles". Table de permissions reproduite à la
// lettre depuis educbenin-prototype.html — les 4 membres et leurs
// permissions par module sont des exemples statiques (aucun modèle de
// permissions par module n'existe encore côté backend, seul le rôle
// ADMIN/SUPERADMIN global existe). "+ Inviter un membre" n'a pas de
// comportement réel dans le prototype — même état ici.

type Perm = 'manage' | 'read' | 'none';

const PERM_LABEL: Record<Perm, string> = {
  manage: 'Gérer',
  read: 'Lecture seule',
  none: 'Aucun accès',
};

const MEMBERS: { name: string; perms: [Perm, Perm, Perm, Perm, Perm] }[] = [
  { name: 'Horace L. — Fondateur', perms: ['manage', 'manage', 'manage', 'manage', 'manage'] },
  {
    name: 'Chimène A. — Agent de traitement',
    perms: ['manage', 'manage', 'read', 'none', 'none'],
  },
  {
    name: 'Roméo K. — Agent authentification',
    perms: ['manage', 'read', 'none', 'none', 'none'],
  },
  { name: 'Estelle D. — Supervision', perms: ['manage', 'manage', 'manage', 'read', 'none'] },
];

export default function ComptesAdminPage() {
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
            {MEMBERS.map((m) => (
              <tr key={m.name}>
                <td>{m.name}</td>
                {m.perms.map((p, i) => (
                  <td key={i}>
                    <span className={`perm ${p}`}>{PERM_LABEL[p]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
