'use client';

import { useEffect, useState } from 'react';
import {
  fetchSuggestions,
  updateSuggestionStatut,
  type Suggestion,
  type SuggestionStatut,
} from '@/lib/admin-suggestions-api';
import { ListGridToggle, type ViewMode } from '@/components/backoffice/ListGridToggle';

const STATUT_FILTERS: { label: string; statut: 'all' | SuggestionStatut }[] = [
  { label: 'Tous', statut: 'all' },
  { label: 'Nouveau', statut: 'nouveau' },
  { label: 'Vu', statut: 'vu' },
  { label: 'À ajouter', statut: 'a_ajouter' },
  { label: 'Refusé', statut: 'refuse' },
];

const STATUT_LABELS: Record<SuggestionStatut, string> = {
  nouveau: 'Nouveau',
  vu: 'Vu',
  a_ajouter: 'À ajouter',
  refuse: 'Refusé',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function SuggestionsList() {
  const [statut, setStatut] = useState<'all' | SuggestionStatut>('all');
  const [sort, setSort] = useState<'date' | 'statut'>('date');
  const [q, setQ] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    nouveau: 0,
    vu: 0,
    a_ajouter: 0,
    refuse: 0,
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchSuggestions({ statut, sort, ...(q ? { q } : {}) });
      setItems(res.items);
      setCounts(res.counts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Only statut/sort should re-trigger an immediate reload; `q` has its
    // own debounced effect below. (No react-hooks/exhaustive-deps plugin is
    // configured in this repo's eslint.config.mjs, so no disable directive
    // is needed here.)
  }, [statut, sort]);

  // Simple debounce for the free-text search, avoiding a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function handleStatutChange(id: string, next: SuggestionStatut) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, statut: next } : s)));
    try {
      await updateSuggestionStatut(id, next);
      void load();
    } catch {
      void load();
    }
  }

  return (
    <>
      <div>
        <h3 className="bo-h1" style={{ marginBottom: 2 }}>
          Suggestions
        </h3>
        <div className="bo-sub" style={{ marginBottom: 0 }}>
          Écoles et filières suggérées par les visiteurs — depuis la page d&rsquo;accueil et la page
          École — INMeS. Sert d&rsquo;indicateur pour prioriser les prochains établissements à
          ajouter.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 260 }}>
          <input
            type="search"
            placeholder="Rechercher par nom, école ou filière…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'statut')}>
            <option value="date">Trier par date (récent d&rsquo;abord)</option>
            <option value="statut">Trier par statut</option>
          </select>
        </div>
        <ListGridToggle mode={view} onChange={setView} />
      </div>

      <div className="dossier-filters" style={{ marginTop: 14 }}>
        {STATUT_FILTERS.map((f) => (
          <button
            key={f.statut}
            type="button"
            className={`df-chip${statut === f.statut ? ' on' : ''}`}
            onClick={() => setStatut(f.statut)}
          >
            {f.label}
            <span className="cnt">{counts[f.statut] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="dossier-empty" style={{ marginTop: 16 }}>
          Chargement…
        </div>
      ) : items.length === 0 ? (
        <div className="dossier-empty" style={{ marginTop: 16 }}>
          Aucune suggestion ne correspond à ce filtre.
        </div>
      ) : view === 'list' ? (
        <div className="tablewrap" style={{ marginTop: 16 }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Contact</th>
                <th>École / filière demandée</th>
                <th>Message</th>
                <th>Reçu le</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td>{s.nom}</td>
                  <td>{s.contact}</td>
                  <td>{s.recherche}</td>
                  <td className="hint">{s.message ?? '—'}</td>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>
                    <select
                      value={s.statut}
                      onChange={(e) =>
                        void handleStatutChange(s.id, e.target.value as SuggestionStatut)
                      }
                    >
                      {(Object.keys(STATUT_LABELS) as SuggestionStatut[]).map((key) => (
                        <option key={key} value={key}>
                          {STATUT_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bo-grid" style={{ marginTop: 16 }}>
          {items.map((s) => (
            <div key={s.id} className="bo-card" style={{ cursor: 'default' }}>
              <div className="bo-card-title">{s.nom}</div>
              <div className="bo-card-row">
                <span>{s.contact}</span>
              </div>
              <div className="bo-card-row">
                <span>{s.recherche}</span>
              </div>
              {s.message && (
                <div className="hint" style={{ fontSize: 12 }}>
                  {s.message}
                </div>
              )}
              <div className="bo-card-row">
                <span>{formatDate(s.createdAt)}</span>
                <select
                  value={s.statut}
                  onChange={(e) =>
                    void handleStatutChange(s.id, e.target.value as SuggestionStatut)
                  }
                >
                  {(Object.keys(STATUT_LABELS) as SuggestionStatut[]).map((key) => (
                    <option key={key} value={key}>
                      {STATUT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
