// Écran Tarifs — docs/design-reference/DESIGN-SPEC.md, section "13. Tarifs".
// "Règle spécialités additionnelles" est explicitement marquée "À définir"
// dans le document (point produit non tranché côté client) — reproduit tel
// quel, pas une valeur à inventer. "Modifier le barème" n'a pas de
// comportement réel dans le prototype.

const HISTORIQUE = [
  { depuis: '01/09/2026', prix: '50 000 FCFA', regle: 'À définir', statut: 'Actif' as const },
  { depuis: '01/01/2026', prix: '45 000 FCFA', regle: '—', statut: 'Archivé' as const },
];

export default function TarifsPage() {
  return (
    <>
      <h3 className="bo-h1">Tarifs</h3>
      <div className="bo-sub">
        Barème propagé automatiquement sur le site vitrine, le formulaire et les devis.
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <h3>Barème actif</h3>
        <div className="sub">En vigueur depuis le 01/09/2026</div>
        <div className="row2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Prix de base (1 spécialité)</label>
            <input defaultValue="50 000 FCFA" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Règle spécialités additionnelles</label>
            <input
              placeholder="ex. + 25 000 FCFA / spécialité supplémentaire"
              defaultValue="À définir"
            />
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-sm">
          Modifier le barème
        </button>
      </div>

      <div className="tablewrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>En vigueur depuis</th>
              <th>Prix de base</th>
              <th>Règle multi-spécialités</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {HISTORIQUE.map((h) => (
              <tr key={h.depuis}>
                <td className="mono">{h.depuis}</td>
                <td>{h.prix}</td>
                <td>{h.regle}</td>
                <td>
                  <span className={`pill ${h.statut === 'Actif' ? 'ok' : 'neutral'}`}>
                    {h.statut}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
