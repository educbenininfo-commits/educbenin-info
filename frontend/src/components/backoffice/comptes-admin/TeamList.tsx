'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApi, invalidateCache } from '@/lib/useApi';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';
import {
  MODULE_KEYS,
  MODULE_LABELS,
  fetchTeam,
  updateMemberRole,
  updateMemberPermissions,
  setMemberStatus,
  removeMember,
  sendInvite,
  type TeamResponse,
  type TeamMember,
  type PendingInvite,
  type ModulePermissions,
  type PermLevel,
} from '@/lib/admin-team-api';
import { InviteMemberModal } from './InviteMemberModal';

const PERM_LABEL: Record<PermLevel, string> = {
  manage: 'Gérer',
  read: 'Lecture seule',
  none: 'Aucun accès',
};

const TEAM_PATH = '/api/admin/team';

// Mirrors src/lib/server/admin/protected-accounts.ts — this founder/owner
// account can never be demoted, suspended, or removed by anyone. Hiding the
// controls here is a UX nicety; the server enforces this regardless.
const PROTECTED_SUPERADMIN_EMAILS = ['lissanonpren@gmail.com'];
function isProtectedSuperadmin(email: string): boolean {
  return PROTECTED_SUPERADMIN_EMAILS.includes(email.trim().toLowerCase());
}

function roleLabel(role: TeamMember['role'], adminLabel: TeamMember['adminLabel']): string {
  if (role === 'SUPERADMIN') return 'Super administrateur';
  return adminLabel === 'SUPPORT' ? 'Support' : 'Administrateur';
}

function matchesQuery(name: string | null, email: string, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return email.toLowerCase().includes(q) || (name ?? '').toLowerCase().includes(q);
}

export function TeamList() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const { role: myRole, id: myId } = useBackofficeAdmin();
  const isSuperadmin = myRole === 'SUPERADMIN';

  const { data, loading, refresh } = useApi<TeamResponse>(TEAM_PATH);
  const members = data?.members ?? [];
  const myMemberRow = members.find((m) => m.id === myId);
  const canManageTeam = isSuperadmin || myMemberRow?.modulePermissions?.comptesAdmin === 'manage';
  const pendingInvites = data?.pendingInvites ?? [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPerms, setDraftPerms] = useState<ModulePermissions | null>(null);
  const [draftLabel, setDraftLabel] = useState<'ADMIN' | 'SUPPORT'>('ADMIN');
  const [confirming, setConfirming] = useState<{
    id: string;
    action: 'suspend' | 'restore' | 'remove';
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  function startEditingPerms(m: TeamMember) {
    setEditingId(m.id);
    setDraftLabel(m.adminLabel === 'SUPPORT' ? 'SUPPORT' : 'ADMIN');
    setDraftPerms(
      m.modulePermissions ?? {
        dossiers: 'read',
        dossiersRejetes: 'none',
        specialites: 'none',
        tarifs: 'none',
        comptesAdmin: 'none',
      },
    );
  }

  async function saveDraftPerms(id: string) {
    if (!draftPerms) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateMemberPermissions(id, { adminLabel: draftLabel, modulePermissions: draftPerms });
      invalidateCache(TEAM_PATH);
      await refresh();
      setEditingId(null);
    } catch {
      setActionError('Impossible d’enregistrer ces accès.');
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id: string, role: 'ADMIN' | 'SUPERADMIN') {
    setBusy(true);
    setActionError(null);
    try {
      await updateMemberRole(id, role);
      invalidateCache(TEAM_PATH);
      await refresh();
    } catch {
      setActionError(
        'Impossible de changer ce rôle (peut-être le dernier super administrateur ?).',
      );
    } finally {
      setBusy(false);
    }
  }

  async function runConfirmedAction() {
    if (!confirming) return;
    setBusy(true);
    setActionError(null);
    try {
      if (confirming.action === 'suspend') {
        await setMemberStatus(confirming.id, 'SUSPENDED');
      } else if (confirming.action === 'restore') {
        await setMemberStatus(confirming.id, 'ACTIVE');
      } else {
        await removeMember(confirming.id);
      }
      invalidateCache(TEAM_PATH);
      await refresh();
    } catch {
      setActionError("Cette action n'a pas pu être effectuée.");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  async function resendInvite(inv: PendingInvite) {
    setResendingEmail(inv.email);
    setActionError(null);
    try {
      await sendInvite({
        email: inv.email,
        role: inv.role,
        adminLabel: inv.adminLabel,
        ...(inv.modulePermissions ? { modulePermissions: inv.modulePermissions } : {}),
      });
      invalidateCache(TEAM_PATH);
      await refresh();
    } catch {
      setActionError("Impossible de renvoyer l'invitation.");
    } finally {
      setResendingEmail(null);
    }
  }

  const visibleMembers = members.filter((m) => matchesQuery(m.name, m.email, query));
  const visibleInvites = pendingInvites.filter((i) => matchesQuery(null, i.email, query));

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
        {canManageTeam && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setInviteOpen(true)}
          >
            + Inviter un membre
          </button>
        )}
      </div>

      {actionError && (
        <p className="err-msg" style={{ marginTop: 10 }}>
          {actionError}
        </p>
      )}

      <div className="tablewrap" style={{ marginTop: 16 }}>
        <table className="dtable">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Rôle</th>
              {MODULE_KEYS.map((k) => (
                <th key={k}>{MODULE_LABELS[k]}</th>
              ))}
              <th>Statut</th>
              {canManageTeam && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={9} className="hint">
                  Chargement…
                </td>
              </tr>
            ) : visibleMembers.length === 0 && visibleInvites.length === 0 ? (
              <tr>
                <td colSpan={9} className="hint">
                  Aucun membre ne correspond à cette recherche.
                </td>
              </tr>
            ) : (
              <>
                {visibleMembers.map((m) => {
                  const isSelf = m.id === myId;
                  const isProtected = isProtectedSuperadmin(m.email);
                  const isEditing = editingId === m.id;
                  const perms = isEditing ? draftPerms! : m.modulePermissions;
                  return (
                    <tr key={m.id}>
                      <td>
                        {m.name ?? m.email}
                        <div className="hint" style={{ fontSize: 11 }}>
                          {m.email}
                        </div>
                      </td>
                      <td>
                        {isSuperadmin && !isSelf && !isProtected ? (
                          <select
                            value={m.role}
                            onChange={(e) =>
                              changeRole(m.id, e.target.value as 'ADMIN' | 'SUPERADMIN')
                            }
                            disabled={busy}
                          >
                            <option value="ADMIN">Administrateur</option>
                            <option value="SUPERADMIN">Super administrateur</option>
                          </select>
                        ) : (
                          roleLabel(m.role, m.adminLabel)
                        )}
                      </td>
                      {MODULE_KEYS.map((k) => (
                        <td key={k}>
                          {m.role === 'SUPERADMIN' ? (
                            <span className="perm manage">Gérer</span>
                          ) : isEditing ? (
                            <select
                              value={perms?.[k] ?? 'none'}
                              onChange={(e) =>
                                setDraftPerms((prev) => ({
                                  ...(prev ??
                                    m.modulePermissions ?? {
                                      dossiers: 'none',
                                      dossiersRejetes: 'none',
                                      specialites: 'none',
                                      tarifs: 'none',
                                      comptesAdmin: 'none',
                                    }),
                                  [k]: e.target.value as PermLevel,
                                }))
                              }
                            >
                              <option value="manage">Gérer</option>
                              <option value="read">Lecture seule</option>
                              <option value="none">Aucun accès</option>
                            </select>
                          ) : (
                            <span className={`perm ${perms?.[k] ?? 'none'}`}>
                              {PERM_LABEL[perms?.[k] ?? 'none']}
                            </span>
                          )}
                        </td>
                      ))}
                      <td>
                        <span className={`pill ${m.status === 'ACTIVE' ? 'ok' : 'danger'}`}>
                          {m.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      {canManageTeam && (
                        <td>
                          {isSuperadmin && m.role === 'ADMIN' && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={busy}
                                    onClick={() => saveDraftPerms(m.id)}
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
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => startEditingPerms(m)}
                                >
                                  Modifier les accès
                                </button>
                              )}
                            </div>
                          )}
                          {isSuperadmin && !isSelf && !isProtected && (
                            <div
                              style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}
                            >
                              {confirming?.id === m.id ? (
                                <>
                                  <span className="hint">Confirmer ?</span>
                                  <button
                                    type="button"
                                    className="btn btn-danger-outline btn-sm"
                                    disabled={busy}
                                    onClick={runConfirmedAction}
                                  >
                                    Oui
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setConfirming(null)}
                                  >
                                    Non
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() =>
                                      setConfirming({
                                        id: m.id,
                                        action: m.status === 'ACTIVE' ? 'suspend' : 'restore',
                                      })
                                    }
                                  >
                                    {m.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-danger-outline btn-sm"
                                    onClick={() => setConfirming({ id: m.id, action: 'remove' })}
                                  >
                                    Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {visibleInvites.map((inv) => (
                  <tr key={inv.inviteId} style={{ opacity: 0.85 }}>
                    <td>
                      {inv.email}
                      <div className="hint" style={{ fontSize: 11 }}>
                        Invitation envoyée
                      </div>
                    </td>
                    <td>{roleLabel(inv.role, inv.adminLabel)}</td>
                    {MODULE_KEYS.map((k) => (
                      <td key={k}>
                        <span className={`perm ${inv.modulePermissions?.[k] ?? 'none'}`}>
                          {PERM_LABEL[inv.modulePermissions?.[k] ?? 'none']}
                        </span>
                      </td>
                    ))}
                    <td>
                      <span className={`pill ${inv.status === 'PENDING' ? 'warn' : 'danger'}`}>
                        {inv.status === 'PENDING' ? 'En attente' : 'Expirée'}
                      </span>
                    </td>
                    {canManageTeam && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={resendingEmail === inv.email}
                          onClick={() => resendInvite(inv)}
                        >
                          Renvoyer l&rsquo;invitation
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <InviteMemberModal
          canInviteSuperadmin={isSuperadmin}
          onClose={() => setInviteOpen(false)}
          onSent={() => {
            setInviteOpen(false);
            invalidateCache(TEAM_PATH);
            void refresh();
          }}
        />
      )}
    </>
  );
}

// Re-export for the server page's metadata/typing convenience, if ever needed.
export type { TeamMember, PendingInvite };
export { fetchTeam };
