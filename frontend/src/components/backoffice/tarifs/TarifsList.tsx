'use client';

import { useEffect, useState } from 'react';
import {
  fetchTarifs,
  saveTarifBareme,
  type AdminTarifCategorie,
  type TarifBaremeRow,
  type TarifMode,
} from '@/lib/admin-tarifs-api';
import { fmtF2 } from '@/lib/format';
import { ListGridToggle, type ViewMode } from '@/components/backoffice/ListGridToggle';

function baremePrixLabel(b: TarifBaremeRow): string {
  if (b.mode === 'unique') return b.montantUnique != null ? fmtF2(b.montantUnique) : '—';
  const n = b.montants ? Object.keys(b.montants).length : 0;
  return `Personnalisé (${n} catégorie${n > 1 ? 's' : ''})`;
}

export function TarifsList() {
  const [categories, setCategories] = useState<AdminTarifCategorie[]>([]);
  const [history, setHistory] = useState<TarifBaremeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');

  const [mode, setMode] = useState<TarifMode>('personnalise');
  const [montants, setMontants] = useState<Record<string, string>>({});
  const [montantUnique, setMontantUnique] = useState('');
  const [regle, setRegle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchTarifs();
      setCategories(res.categories);
      setHistory(res.history);
      if (res.active) {
        setMode(res.active.mode);
        setMontantUnique(res.active.montantUnique != null ? String(res.active.montantUnique) : '');
        setRegle(res.active.regleSpecialitesAdditionnelles ?? '');
        setMontants(
          res.active.mode === 'personnalise' && res.active.montants
            ? Object.fromEntries(
                Object.entries(res.active.montants).map(([k, v]) => [k, String(v)]),
              )
            : Object.fromEntries(
                res.categories.map((c) => [
                  c.id,
                  c.tarifDepart != null ? String(c.tarifDepart) : '',
                ]),
              ),
        );
      } else {
        setMontants(
          Object.fromEntries(
            res.categories.map((c) => [c.id, c.tarifDepart != null ? String(c.tarifDepart) : '']),
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave() {
    setError(null);
    if (mode === 'unique') {
      const n = Number(montantUnique);
      if (!montantUnique.trim() || !Number.isFinite(n) || n <= 0) {
        setError('Indiquez un montant unique valide.');
        return;
      }
    } else {
      for (const c of categories) {
        const n = Number(montants[c.id]);
        if (!montants[c.id]?.trim() || !Number.isFinite(n) || n <= 0) {
          setError(`Indiquez un montant valide pour « ${c.libelleCourt ?? c.libelle} ».`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      await saveTarifBareme({
        mode,
        ...(mode === 'unique'
          ? { montantUnique: Number(montantUnique) }
          : {
              montants: Object.fromEntries(categories.map((c) => [c.id, Number(montants[c.id])])),
            }),
        ...(regle.trim() ? { regleSpecialitesAdditionnelles: regle.trim() } : {}),
      });
      await load();
    } catch {
      setError("Impossible d'enregistrer ce barème.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <h3 className="bo-h1">Tarifs</h3>
        <p className="hint" style={{ marginTop: 16 }}>
          Chargement…
        </p>
      </>
    );
  }

  return (
    <>
      <h3 className="bo-h1">Tarifs</h3>
      <div className="bo-sub">
        Barème propagé automatiquement sur le site vitrine, le formulaire et les devis.
      </div>

      <div className="panel" style={{ marginTop: 16, marginBottom: 18 }}>
        <h3>Barème actif</h3>
        <div className="sub">
          {history[0]
            ? `En vigueur depuis le ${new Date(history[0].effectiveFrom).toLocaleDateString('fr-FR')}`
            : 'Aucun barème enregistré pour le moment — les valeurs ci-dessous reflètent la configuration actuelle.'}
        </div>

        <div className="dossier-filters" style={{ marginTop: 10, marginBottom: 14 }}>
          <button
            type="button"
            className={`df-chip${mode === 'personnalise' ? ' on' : ''}`}
            onClick={() => setMode('personnalise')}
          >
            Personnalisé par accompagnement
          </button>
          <button
            type="button"
            className={`df-chip${mode === 'unique' ? ' on' : ''}`}
            onClick={() => setMode('unique')}
          >
            Tarif unique
          </button>
        </div>

        {mode === 'unique' ? (
          <div className="field">
            <label>Montant unique (tous accompagnements)</label>
            <input
              value={montantUnique}
              onChange={(e) => setMontantUnique(e.target.value)}
              placeholder="50000"
              inputMode="numeric"
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
            {categories.map((c) => (
              <div className="field" key={c.id} style={{ marginBottom: 0 }}>
                <label>
                  {c.ecoleNom} — {c.libelleCourt ?? c.libelle}
                </label>
                <input
                  value={montants[c.id] ?? ''}
                  onChange={(e) => setMontants((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  placeholder="50000"
                  inputMode="numeric"
                />
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <label>Règle spécialités additionnelles (D.E.S.)</label>
          <input
            value={regle}
            onChange={(e) => setRegle(e.target.value)}
            placeholder="ex. + 25 000 FCFA / spécialité supplémentaire"
          />
        </div>

        {error && (
          <p className="err-msg" style={{ marginBottom: 10 }}>
            {error}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Enregistrement…' : 'Modifier le barème'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <h3 style={{ margin: 0 }}>Historique des barèmes</h3>
        <ListGridToggle mode={view} onChange={setView} />
      </div>

      {view === 'list' ? (
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
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="hint">
                    Aucun barème enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id}>
                    <td className="mono">
                      {new Date(h.effectiveFrom).toLocaleDateString('fr-FR')}
                    </td>
                    <td>{baremePrixLabel(h)}</td>
                    <td>{h.regleSpecialitesAdditionnelles ?? '—'}</td>
                    <td>
                      <span className={`pill ${h.statut === 'Actif' ? 'ok' : 'neutral'}`}>
                        {h.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bo-grid">
          {history.length === 0 ? (
            <p className="hint">Aucun barème enregistré pour le moment.</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="bo-card">
                <div className="bo-card-title">{baremePrixLabel(h)}</div>
                <div className="bo-card-row">
                  <span className="mono">
                    Depuis le {new Date(h.effectiveFrom).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="bo-card-row">
                  <span>{h.regleSpecialitesAdditionnelles ?? '—'}</span>
                </div>
                <div className="bo-card-badges">
                  <span className={`pill ${h.statut === 'Actif' ? 'ok' : 'neutral'}`}>
                    {h.statut}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
