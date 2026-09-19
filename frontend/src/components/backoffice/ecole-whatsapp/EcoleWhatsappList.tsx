'use client';

import { useEffect, useState } from 'react';
import {
  fetchAdminEcoles,
  fetchAdminFilieres,
  updateEcoleWhatsapp,
  updateFiliere,
  updateCategoriePieces,
  type AdminEcole,
  type AdminFiliere,
} from '@/lib/admin-ecole-whatsapp-api';
import { ecoleBadgeClass } from '@/lib/ecole-display';
import { ListGridToggle, type ViewMode } from '@/components/backoffice/ListGridToggle';
import { AddEcoleModal } from './AddEcoleModal';

interface EditDraft {
  nom: string;
  date: string;
  heure: string;
  salle: string;
  lienWhatsapp: string;
}

export function EcoleWhatsappList() {
  const [ecoles, setEcoles] = useState<AdminEcole[]>([]);
  const [ecoleId, setEcoleId] = useState<string | null>(null);
  const [categorieId, setCategorieId] = useState('all');
  const [filieres, setFilieres] = useState<AdminFiliere[]>([]);
  const [loadingEcoles, setLoadingEcoles] = useState(true);
  const [loadingFilieres, setLoadingFilieres] = useState(true);
  const [view, setView] = useState<ViewMode>('list');
  const [addOpen, setAddOpen] = useState(false);
  const [waDraft, setWaDraft] = useState('');
  const [waSaving, setWaSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [piecesDraft, setPiecesDraft] = useState('');
  const [piecesLegendDraft, setPiecesLegendDraft] = useState('');
  const [piecesSaving, setPiecesSaving] = useState(false);

  async function loadEcoles() {
    setLoadingEcoles(true);
    try {
      const res = await fetchAdminEcoles();
      setEcoles(res.items);
      setEcoleId((prev) => prev ?? res.items[0]?.id ?? null);
    } finally {
      setLoadingEcoles(false);
    }
  }

  useEffect(() => {
    void loadEcoles();
  }, []);

  const currentEcole = ecoles.find((e) => e.id === ecoleId) ?? null;

  useEffect(() => {
    setWaDraft(currentEcole?.lienWhatsappGeneral ?? '');
    // Only re-sync the draft when the selected école itself changes, not on
    // every currentEcole object identity change (e.g. after saving).
  }, [currentEcole?.id]);

  async function loadFilieres() {
    if (!ecoleId) return;
    setLoadingFilieres(true);
    try {
      const res = await fetchAdminFilieres(ecoleId, categorieId);
      setFilieres(res.items);
    } finally {
      setLoadingFilieres(false);
    }
  }

  useEffect(() => {
    void loadFilieres();
    // loadFilieres itself only depends on ecoleId/categorieId (closed over
    // fresh on every render), so listing just those two here is correct.
  }, [ecoleId, categorieId]);

  async function saveWhatsapp() {
    if (!currentEcole || !waDraft.trim()) return;
    setWaSaving(true);
    try {
      await updateEcoleWhatsapp(currentEcole.id, waDraft.trim());
      await loadEcoles();
    } finally {
      setWaSaving(false);
    }
  }

  function startEdit(f: AdminFiliere) {
    setEditingId(f.id);
    setEditDraft({
      nom: f.nom,
      date: f.date ?? '',
      heure: f.heure ?? '',
      salle: f.salle ?? '',
      lienWhatsapp: f.lienWhatsapp ?? '',
    });
  }

  async function saveEdit(f: AdminFiliere) {
    if (!editDraft) return;
    await updateFiliere(f.id, {
      nom: editDraft.nom.trim(),
      ...(f.typeAdmission === 'concours_ou_composition'
        ? {
            date: editDraft.date.trim() || null,
            heure: editDraft.heure.trim() || null,
            salle: editDraft.salle.trim() || null,
          }
        : {}),
      lienWhatsapp: editDraft.lienWhatsapp.trim() || null,
    });
    setEditingId(null);
    setEditDraft(null);
    void loadFilieres();
  }

  const waLabel = currentEcole
    ? categorieId === 'all'
      ? `Communauté WhatsApp ${currentEcole.nom} (toutes catégories)`
      : `Communauté WhatsApp ${currentEcole.nom} — ${
          currentEcole.categories.find((c) => c.id === categorieId)?.libelleCourt ??
          currentEcole.categories.find((c) => c.id === categorieId)?.libelle ??
          ''
        }`
    : '';

  const currentCategorie =
    currentEcole && categorieId !== 'all'
      ? (currentEcole.categories.find((c) => c.id === categorieId) ?? null)
      : null;

  useEffect(() => {
    setPiecesDraft((currentCategorie?.piecesAFournir ?? []).join('\n'));
    setPiecesLegendDraft(currentCategorie?.piecesLegend ?? '');
    // Only re-sync when the selected catégorie itself changes, not on every
    // currentCategorie object identity change (e.g. right after saving).
  }, [currentCategorie?.id]);

  async function savePieces() {
    if (!currentCategorie) return;
    setPiecesSaving(true);
    try {
      const pieces = piecesDraft
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      await updateCategoriePieces(currentCategorie.id, {
        piecesAFournir: pieces,
        piecesLegend: piecesLegendDraft.trim() || null,
      });
      await loadEcoles();
    } finally {
      setPiecesSaving(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h3 className="bo-h1" style={{ marginBottom: 2 }}>
            École &amp; WhatsApp
          </h3>
          <div className="bo-sub" style={{ marginBottom: 0 }}>
            Année scolaire 2026-2027
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ListGridToggle mode={view} onChange={setView} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
            + Ajouter une école
          </button>
        </div>
      </div>

      {loadingEcoles ? (
        <p className="hint" style={{ marginTop: 16 }}>
          Chargement…
        </p>
      ) : (
        <>
          <div className="dossier-filters" style={{ marginTop: 16 }}>
            {ecoles.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`df-chip${ecoleId === e.id ? ' on' : ''}`}
                onClick={() => {
                  setEcoleId(e.id);
                  setCategorieId('all');
                }}
              >
                {e.nom}
              </button>
            ))}
          </div>

          {currentEcole && (
            <div className="dossier-filters" style={{ marginTop: 8 }}>
              <button
                type="button"
                className={`df-chip${categorieId === 'all' ? ' on' : ''}`}
                onClick={() => setCategorieId('all')}
              >
                Tout
              </button>
              {currentEcole.categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`df-chip${categorieId === c.id ? ' on' : ''}`}
                  onClick={() => setCategorieId(c.id)}
                >
                  {c.libelleCourt ?? c.libelle}
                </button>
              ))}
            </div>
          )}

          {currentEcole && (
            <div className="panel" style={{ marginTop: 18 }}>
              <h3>{waLabel}</h3>
              <div className="sub">
                Un seul lien, mis à jour ici, propagé automatiquement sur les fiches publiques
                concernées.
              </div>
              <div className="row2" style={{ alignItems: 'flex-end' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Lien du groupe WhatsApp général</label>
                  <input
                    value={waDraft}
                    onChange={(e) => setWaDraft(e.target.value)}
                    placeholder="https://chat.whatsapp.com/…"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ height: 44 }}
                  disabled={waSaving || !waDraft.trim()}
                  onClick={() => void saveWhatsapp()}
                >
                  {waSaving ? 'Enregistrement…' : 'Enregistrer et propager'}
                </button>
              </div>
            </div>
          )}

          {currentCategorie && (
            <div className="panel" style={{ marginTop: 18 }}>
              <h3>
                Pièces à fournir — {currentCategorie.libelleCourt ?? currentCategorie.libelle}
              </h3>
              <div className="sub">
                Une pièce par ligne. Propagé automatiquement sur la page de demande correspondante.
              </div>
              <div className="field">
                <label>Pièces à fournir</label>
                <textarea
                  rows={Math.max(6, piecesDraft.split('\n').length)}
                  value={piecesDraft}
                  onChange={(e) => setPiecesDraft(e.target.value)}
                  placeholder={
                    'Une demande manuscrite adressée au Doyen…\nUne copie légalisée de l’acte de naissance…'
                  }
                />
              </div>
              <div className="field">
                <label>Légende (optionnelle)</label>
                <input
                  value={piecesLegendDraft}
                  onChange={(e) => setPiecesLegendDraft(e.target.value)}
                  placeholder="ex. d'après le communiqué N°725/UAC/FSS du 8 avril 2026"
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={piecesSaving}
                onClick={() => void savePieces()}
              >
                {piecesSaving ? 'Enregistrement…' : 'Enregistrer les pièces à fournir'}
              </button>
            </div>
          )}

          {loadingFilieres ? (
            <p className="hint" style={{ marginTop: 16 }}>
              Chargement…
            </p>
          ) : view === 'list' ? (
            <div className="tablewrap" style={{ marginTop: 16 }}>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Filière / spécialité</th>
                    <th>Catégorie</th>
                    <th>Date</th>
                    <th>Heure</th>
                    <th>Salle</th>
                    <th>WhatsApp filière</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filieres.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="hint">
                        Aucune filière pour cette sélection.
                      </td>
                    </tr>
                  ) : (
                    filieres.map((f) => {
                      const isConcours = f.typeAdmission === 'concours_ou_composition';
                      const editing = editingId === f.id;
                      return (
                        <tr key={f.id}>
                          <td>
                            {editing ? (
                              <input
                                value={editDraft!.nom}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, nom: e.target.value } : d))
                                }
                              />
                            ) : (
                              f.nom
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge-ecole ${ecoleBadgeClass(currentEcole?.nom ?? '')}`}
                            >
                              {f.categorieLabel}
                            </span>
                          </td>
                          <td className="mono">
                            {editing && isConcours ? (
                              <input
                                value={editDraft!.date}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, date: e.target.value } : d))
                                }
                                style={{ width: 110 }}
                              />
                            ) : isConcours ? (
                              (f.date ?? '—')
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="mono">
                            {editing && isConcours ? (
                              <input
                                value={editDraft!.heure}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, heure: e.target.value } : d))
                                }
                                style={{ width: 70 }}
                              />
                            ) : isConcours ? (
                              (f.heure ?? '—')
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {editing && isConcours ? (
                              <input
                                value={editDraft!.salle}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, salle: e.target.value } : d))
                                }
                                style={{ width: 90 }}
                              />
                            ) : isConcours ? (
                              (f.salle ?? '—')
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="mono">
                            {editing ? (
                              <input
                                value={editDraft!.lienWhatsapp}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d ? { ...d, lienWhatsapp: e.target.value } : d,
                                  )
                                }
                                placeholder="https://chat.whatsapp.com/…"
                              />
                            ) : f.lienWhatsapp ? (
                              f.lienWhatsapp.replace(/^https?:\/\//, '').slice(0, 24) + '…'
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {editing ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => void saveEdit(f)}
                                >
                                  Enregistrer
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => setEditingId(null)}
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => startEdit(f)}
                              >
                                Modifier
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bo-grid" style={{ marginTop: 16 }}>
              {filieres.map((f) => (
                <div key={f.id} className="bo-card" onClick={() => startEdit(f)}>
                  <div className="bo-card-title">{f.nom}</div>
                  <div className="bo-card-badges">
                    <span className={`badge-ecole ${ecoleBadgeClass(currentEcole?.nom ?? '')}`}>
                      {f.categorieLabel}
                    </span>
                  </div>
                  {f.typeAdmission === 'concours_ou_composition' && (
                    <div className="bo-card-row">
                      <span>{f.date ?? '—'}</span>
                      <span>{f.heure ?? '—'}</span>
                      <span>{f.salle ?? '—'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--prod-ink-faint)' }}>
            GAM/FSS = Grand Amphi Médecine (FSS) · A2/FSS = Amphi 2 Médecine (FSS) · A5/FSS = Amphi
            5 ESAS · CNHU-HKM et LAZARET = sites hors campus FSS.
          </div>
        </>
      )}

      {addOpen && (
        <AddEcoleModal onClose={() => setAddOpen(false)} onCreated={() => void loadEcoles()} />
      )}
    </>
  );
}
