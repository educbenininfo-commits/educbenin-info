// Écran Dossiers rejetés — docs/design-reference/DESIGN-SPEC.md, section
// "11. Dossiers rejetés". Table statique reproduite à la lettre — ces 3
// lignes sont indépendantes du modèle Dossiers (voir /admin/dossiers) dans
// le prototype, et le bouton "Restaurer" n'y a pas de handler ; même état
// ici, en cohérence avec le document.

const REJETES = [
  {
    dossier: 'Dr. Kpadonou F. · EB-2026-000355',
    spec: 'Chirurgie Générale, Pédiatrie',
    motif: 'Pièces 1 et 2 non dupliquées par spécialité',
    date: '28/08/2026',
  },
  {
    dossier: 'Dr. Tchibozo H. · EB-2026-000341',
    spec: 'Imagerie Médicale',
    motif: 'Diplôme de Doctorat manquant',
    date: '24/08/2026',
  },
  {
    dossier: 'Dr. Gbaguidi N. · EB-2026-000298',
    spec: 'Anesthésie-Réanimation',
    motif: 'Relevé de notes du Baccalauréat non certifié',
    date: '19/08/2026',
  },
];

export default function DossiersRejetesPage() {
  return (
    <>
      <h3 className="bo-h1">Dossiers rejetés</h3>
      <div className="bo-sub">Restaurables à tout moment vers « Dossiers reçus ».</div>
      <div className="tablewrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Dossier</th>
              <th>Spécialité</th>
              <th>Motif</th>
              <th>Rejeté le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {REJETES.map((r) => (
              <tr key={r.dossier}>
                <td>{r.dossier}</td>
                <td>{r.spec}</td>
                <td className="rej-reason">{r.motif}</td>
                <td className="mono">{r.date}</td>
                <td>
                  <button type="button" className="btn btn-outline btn-sm">
                    Restaurer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
