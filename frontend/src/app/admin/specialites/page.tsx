// Écran Spécialités & WhatsApp — docs/design-reference/DESIGN-SPEC.md,
// section "12. Spécialités & WhatsApp". Réutilise la même source de données
// (SPECIALTIES) que l'écran public /specialites. Ni "Enregistrer et
// propager" ni les boutons "Modifier" par ligne n'ont de comportement réel
// dans le prototype — même état ici.

import { SPECIALTIES } from '@/lib/specialties';

export default function SpecialitesAdminPage() {
  return (
    <>
      <h3 className="bo-h1">Spécialités &amp; WhatsApp</h3>
      <div className="bo-sub">Année scolaire 2026-2027</div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <h3>Communauté WhatsApp FSS (toutes spécialités)</h3>
        <div className="sub">
          Un seul lien, mis à jour ici, propagé automatiquement sur les 27 fiches spécialité.
        </div>
        <div className="row2" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Lien du groupe WhatsApp FSS</label>
            <input defaultValue="https://chat.whatsapp.com/fss-communaute-generale" />
          </div>
          <button type="button" className="btn btn-primary" style={{ height: 44 }}>
            Enregistrer et propager
          </button>
        </div>
      </div>

      <div className="tablewrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Spécialité</th>
              <th>Date</th>
              <th>Heure</th>
              <th>Salle</th>
              <th>WhatsApp spécialité</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SPECIALTIES.map((s) => (
              <tr key={s.code}>
                <td>{s.name}</td>
                <td className="mono">{s.date}</td>
                <td className="mono">{s.heure}</td>
                <td>{s.salle}</td>
                <td className="mono">wa.me/{s.code.toLowerCase()}…</td>
                <td>
                  <button type="button" className="btn btn-outline btn-sm">
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{ marginTop: 12, fontSize: 11.5, color: 'var(--prod-ink-faint)', lineHeight: 1.6 }}
      >
        GAM/FSS = Grand Amphi Médecine (FSS) · A2/FSS = Amphi 2 Médecine (FSS) · A5/FSS = Amphi 5
        ESAS · CNHU-HKM et LAZARET = sites hors campus FSS.
      </div>
    </>
  );
}
