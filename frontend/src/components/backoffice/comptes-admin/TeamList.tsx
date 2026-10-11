'use client';

// Écran « Comptes admin & rôles » — onglets Membres / Rôles, cadrans de
// synthèse, membres en cartes (ou liste) avec accès par module, invitations
// en attente, et une carte par rôle résumant ce qu'il permet. Toute la
// logique (rôle, accès par module, suspension, suppression, renvoi
// d'invitation) passe par les mêmes routes qu'avant (lib/admin-team-api.ts) ;
// le serveur re-vérifie chaque droit.

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Ban,
  Eye,
  Mail,
  Pencil,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { useApi, invalidateCache } from '@/lib/useApi';
import { useBackofficeAdmin } from '@/contexts/BackofficeAdminContext';
import {
  MODULE_KEYS,
  MODULE_LABELS,
  fetchTeam,
  fullAccessPermissions,
  supportDefaultPermissions,
  updateMemberRole,
  updateMemberPermissions,
  setMemberStatus,
  removeMember,
  sendInvite,
  type TeamResponse,
  type TeamMember,
  type PendingInvite,
  type ModuleKey,
  type ModulePermissions,
  type PermLevel,
} from '@/lib/admin-team-api';
import { InviteMemberModal } from './InviteMemberModal';
import { ListGridToggle, type ViewMode } from '@/components/backoffice/ListGridToggle';
import { StatCard } from '@/components/backoffice/StatCard';

const TEAM_PATH = '/api/admin/team';

// Mirrors src/lib/server/admin/protected-accounts.ts — this founder/owner
// account can never be demoted, suspended, or removed by anyone. Hiding the
// controls here is a UX nicety; the server enforces this regardless.
const PROTECTED_SUPERADMIN_EMAILS = ['lissanonpren@gmail.com'];
function isProtectedSuperadmin(email: string): boolean {
  return PROTECTED_SUPERADMIN_EMAILS.includes(email.trim().toLowerCase());
}

const NO_ACCESS: ModulePermissions = {
  dossiers: 'none',
  dossiersRejetes: 'none',
  specialites: 'none',
  tarifs: 'none',
  comptesAdmin: 'none',
};

function roleLabel(role: TeamMember['role'], adminLabel: TeamMember['adminLabel']): string {
  if (role === 'SUPERADMIN') return 'Super administrateur';
  return adminLabel === 'SUPPORT' ? 'Support' : 'Administrateur';
}

function matchesQuery(name: string | null, email: string, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return email.toLowerCase().includes(q) || (name ?? '').toLowerCase().includes(q);
}

function initials(name: string | null, email: string): string {
  const parts = (name || email.replace(/@.*/, '')).split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function permsOf(role: TeamMember['role'], perms: ModulePermissions | null): ModulePermissions {
  return role === 'SUPERADMIN' ? fullAccessPermissions() : (perms ?? NO_ACCESS);
}

function modulesAt(perms: ModulePermissions, level: PermLevel): ModuleKey[] {
  return MODULE_KEYS.filter((k) => perms[k] === level);
}

function PermChips({ perms }: { perms: ModulePermissions }) {
  const manage = modulesAt(perms, 'manage');
  const read = modulesAt(perms, 'read');
  if (manage.length === 0 && read.length === 0) {
    return <span className="hint">Aucun accès aux modules</span>;
  }
  return (
    <div className="perm-groups">
      {manage.length > 0 && (
        <div>
          <span className="perm-head">
            <Pencil size={13} /> Gérer
          </span>
          <div className="perm-chips">
            {manage.map((k) => (
              <span key={k} className="perm-chip manage">
                {MODULE_LABELS[k]}
              </span>
            ))}
          </div>
        </div>
      )}
      {read.length > 0 && (
        <div>
          <span className="perm-head">
            <Eye size={13} /> Lecture seule
          </span>
          <div className="perm-chips">
            {read.map((k) => (
              <span key={k} className="perm-chip">
                {MODULE_LABELS[k]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_CARDS: Array<{
  key: 'SUPERADMIN' | 'ADMIN' | 'SUPPORT';
  title: string;
  desc: string;
  perms: ModulePermissions;
  sensitive: string[];
}> = [
  {
    key: 'SUPERADMIN',
    title: 'Super administrateur',
    desc: 'Tous les droits, sur tous les modules.',
    perms: fullAccessPermissions(),
    sensitive: [
      'Changer le rôle d’un membre',
      'Suspendre, réactiver ou supprimer un membre',
      'Exporter un dossier complet (.zip)',
      'Voir le journal des connexions',
    ],
  },
  {
    key: 'ADMIN',
    title: 'Administrateur',
    desc: 'Accès par défaut ci-dessous, ajustable membre par membre.',
    perms: fullAccessPermissions(),
    sensitive: [],
  },
  {
    key: 'SUPPORT',
    title: 'Support',
    desc: 'Consultation des dossiers ; accès ajustable membre par membre.',
    perms: supportDefaultPermissions(),
    sensitive: [],
  },
];

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

  const [tab, setTab] = useState<'members' | 'roles'>('members');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'SUPPORT' | null>(null);
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
  const [view, setView] = useState<ViewMode>('grid');

  function startEditingPerms(m: TeamMember) {
    setEditingId(m.id);
    setDraftLabel(m.adminLabel === 'SUPPORT' ? 'SUPPORT' : 'ADMIN');
    setDraftPerms(m.modulePermissions ?? { ...NO_ACCESS, dossiers: 'read' });
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
        ...(inv.name ? { name: inv.name } : {}),
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
  const visibleInvites = pendingInvites.filter((i) => matchesQuery(i.name, i.email, query));
  const dash = loading && !data;
  const v = (n: number) => (dash ? '—' : n);

  const roleCount = (key: 'SUPERADMIN' | 'ADMIN' | 'SUPPORT') =>
    members.filter((m) =>
      key === 'SUPERADMIN'
        ? m.role === 'SUPERADMIN'
        : m.role === 'ADMIN' && (m.adminLabel === 'SUPPORT') === (key === 'SUPPORT'),
    ).length;

  function permEditor(m: TeamMember) {
    if (!draftPerms) return null;
    return (
      <div className="perm-editor">
        <div className="field">
          <label>Profil</label>
          <select
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value as 'ADMIN' | 'SUPPORT')}
          >
            <option value="ADMIN">Administrateur</option>
            <option value="SUPPORT">Support</option>
          </select>
        </div>
        {MODULE_KEYS.map((k) => (
          <div key={k} className="field">
            <label>{MODULE_LABELS[k]}</label>
            <select
              value={draftPerms[k]}
              onChange={(e) =>
                setDraftPerms((prev) => ({
                  ...(prev ?? NO_ACCESS),
                  [k]: e.target.value as PermLevel,
                }))
              }
            >
              <option value="manage">Gérer</option>
              <option value="read">Lecture seule</option>
              <option value="none">Aucun accès</option>
            </select>
          </div>
        ))}
        <div className="perm-editor-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => void saveDraftPerms(m.id)}
          >
            Enregistrer les accès
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setEditingId(null)}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  function memberActions(m: TeamMember) {
    const isSelf = m.id === myId;
    const isProtected = isProtectedSuperadmin(m.email);
    if (!canManageTeam) return null;
    if (confirming?.id === m.id) {
      return (
        <div className="member-actions">
          <span className="hint">
            {confirming.action === 'remove'
              ? 'Supprimer ce membre ?'
              : confirming.action === 'suspend'
                ? 'Suspendre ce membre ?'
                : 'Réactiver ce membre ?'}
          </span>
          <button
            type="button"
            className="btn btn-danger-outline btn-sm"
            disabled={busy}
            onClick={() => void runConfirmedAction()}
          >
            Confirmer
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setConfirming(null)}
          >
            Annuler
          </button>
        </div>
      );
    }
    return (
      <div className="member-actions">
        {isSuperadmin && m.role === 'ADMIN' && editingId !== m.id && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => startEditingPerms(m)}
          >
            <Pencil size={14} /> Accès
          </button>
        )}
        {isSuperadmin && !isSelf && !isProtected && (
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                setConfirming({ id: m.id, action: m.status === 'ACTIVE' ? 'suspend' : 'restore' })
              }
            >
              {m.status === 'ACTIVE' ? (
                <>
                  <Ban size={14} /> Suspendre
                </>
              ) : (
                <>
                  <RotateCcw size={14} /> Réactiver
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-danger-outline btn-sm"
              onClick={() => setConfirming({ id: m.id, action: 'remove' })}
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </>
        )}
      </div>
    );
  }

  function roleCell(m: TeamMember) {
    const isSelf = m.id === myId;
    const isProtected = isProtectedSuperadmin(m.email);
    if (isSuperadmin && !isSelf && !isProtected) {
      return (
        <select
          className="role-select"
          value={m.role}
          aria-label={`Rôle de ${m.name ?? m.email}`}
          onChange={(e) => void changeRole(m.id, e.target.value as 'ADMIN' | 'SUPERADMIN')}
          disabled={busy}
        >
          <option value="ADMIN">{roleLabel('ADMIN', m.adminLabel)}</option>
          <option value="SUPERADMIN">Super administrateur</option>
        </select>
      );
    }
    return <span>{roleLabel(m.role, m.adminLabel)}</span>;
  }

  function identity(name: string | null, email: string, pending = false) {
    return (
      <div className="member-id">
        <span className={`member-avatar${pending ? ' pending' : ''}`} aria-hidden="true">
          {pending ? <Mail size={16} /> : initials(name, email)}
        </span>
        <span className="member-names">
          <strong>{name ?? email}</strong>
          {name && <small>{email}</small>}
          {!name && pending && <small>Invitation envoyée</small>}
        </span>
      </div>
    );
  }

  const statusPill = (m: TeamMember) => (
    <span className={`pill ${m.status === 'ACTIVE' ? 'ok' : 'danger'}`}>
      {m.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
    </span>
  );
  const invitePill = (inv: PendingInvite) => (
    <span className={`pill ${inv.status === 'PENDING' ? 'warn' : 'danger'}`}>
      {inv.status === 'PENDING' ? 'En attente' : 'Expirée'}
    </span>
  );
  const resendButton = (inv: PendingInvite) =>
    canManageTeam && (
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={resendingEmail === inv.email}
        onClick={() => void resendInvite(inv)}
      >
        <Send size={14} /> {resendingEmail === inv.email ? 'Envoi…' : 'Renvoyer'}
      </button>
    );
  const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

  return (
    <>
      <div className="bo-page-head">
        <div>
          <h3 className="bo-h1">Comptes admin &amp; rôles</h3>
          <div className="bo-sub">
            Invitez vos collaborateurs et choisissez, module par module, ce que chacun peut faire.
          </div>
        </div>
        {canManageTeam && (
          <div className="bo-head-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setInviteRole('ADMIN')}
            >
              <UserPlus size={17} /> Inviter un membre
            </button>
          </div>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          label="Membres actifs"
          value={v(members.filter((m) => m.status === 'ACTIVE').length)}
          icon={Users}
          caption="Accès au back-office"
          featured
        />
        <StatCard
          label="Super administrateurs"
          value={v(roleCount('SUPERADMIN'))}
          icon={ShieldCheck}
          chip="violet"
          caption="Tous les droits"
        />
        <StatCard
          label="Invitations en attente"
          value={v(pendingInvites.filter((i) => i.status === 'PENDING').length)}
          icon={Mail}
          chip="gold"
          caption="Pas encore acceptées"
        />
        <StatCard
          label="Suspendus"
          value={v(members.filter((m) => m.status === 'SUSPENDED').length)}
          icon={UserX}
          chip="danger"
          caption="Accès bloqué"
        />
      </div>

      <div className="bo-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'members'}
          className={tab === 'members' ? 'on' : ''}
          onClick={() => setTab('members')}
        >
          Membres ({members.length + pendingInvites.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'roles'}
          className={tab === 'roles' ? 'on' : ''}
          onClick={() => setTab('roles')}
        >
          Rôles ({ROLE_CARDS.length})
        </button>
      </div>

      {actionError && (
        <p className="err-msg" style={{ marginBottom: 12 }}>
          {actionError}
        </p>
      )}

      {tab === 'members' ? (
        <>
          <div className="list-toolbar">
            <p className="bo-sub" style={{ margin: 0 }}>
              Les personnes qui ont accès au back-office, avec leur rôle et leurs accès.
            </p>
            <ListGridToggle mode={view} onChange={setView} />
          </div>

          {dash ? (
            <div className="dossier-empty">Chargement…</div>
          ) : visibleMembers.length === 0 && visibleInvites.length === 0 ? (
            <div className="panel empty-state">
              <div className="tile">
                <UserPlus size={20} />
              </div>
              <strong>Aucun membre trouvé</strong>
              {query
                ? 'Aucun membre ne correspond à cette recherche.'
                : 'Invitez votre premier collaborateur.'}
            </div>
          ) : view === 'grid' ? (
            <div className="member-grid">
              {visibleMembers.map((m) => (
                <article
                  key={m.id}
                  className={`member-card${m.status === 'SUSPENDED' ? ' off' : ''}`}
                >
                  <div className="mc-row">
                    <span className="mc-label">Membre</span>
                    {identity(m.name, m.email)}
                  </div>
                  <div className="mc-row inline">
                    <span className="mc-label">Rôle</span>
                    {roleCell(m)}
                  </div>
                  <div className="mc-row inline">
                    <span className="mc-label">Statut</span>
                    {statusPill(m)}
                  </div>
                  <div className="mc-row inline">
                    <span className="mc-label">Ajouté le</span>
                    <span>{dateFr(m.createdAt)}</span>
                  </div>
                  <div className="mc-row">
                    <span className="mc-label">Accès</span>
                    {editingId === m.id ? (
                      permEditor(m)
                    ) : (
                      <PermChips perms={permsOf(m.role, m.modulePermissions)} />
                    )}
                  </div>
                  {canManageTeam && <div className="mc-foot">{memberActions(m)}</div>}
                </article>
              ))}
              {visibleInvites.map((inv) => (
                <article key={inv.inviteId} className="member-card pending">
                  <div className="mc-row">
                    <span className="mc-label">Invitation</span>
                    {identity(inv.name, inv.email, true)}
                  </div>
                  <div className="mc-row inline">
                    <span className="mc-label">Rôle</span>
                    <span>{roleLabel(inv.role, inv.adminLabel)}</span>
                  </div>
                  <div className="mc-row inline">
                    <span className="mc-label">Statut</span>
                    {invitePill(inv)}
                  </div>
                  <div className="mc-row inline">
                    <span className="mc-label">Expire le</span>
                    <span>{dateFr(inv.expiresAt)}</span>
                  </div>
                  <div className="mc-row">
                    <span className="mc-label">Accès</span>
                    <PermChips perms={permsOf(inv.role, inv.modulePermissions)} />
                  </div>
                  {canManageTeam && (
                    <div className="mc-foot">
                      <div className="member-actions">{resendButton(inv)}</div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="tablewrap">
              <table className="dtable member-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Rôle</th>
                    <th>Accès</th>
                    <th>Statut</th>
                    {canManageTeam && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((m) => (
                    <tr key={m.id}>
                      <td>{identity(m.name, m.email)}</td>
                      <td>{roleCell(m)}</td>
                      <td>
                        {editingId === m.id ? (
                          permEditor(m)
                        ) : (
                          <PermChips perms={permsOf(m.role, m.modulePermissions)} />
                        )}
                      </td>
                      <td>{statusPill(m)}</td>
                      {canManageTeam && <td>{memberActions(m)}</td>}
                    </tr>
                  ))}
                  {visibleInvites.map((inv) => (
                    <tr key={inv.inviteId} className="pending-row">
                      <td>{identity(inv.name, inv.email, true)}</td>
                      <td>{roleLabel(inv.role, inv.adminLabel)}</td>
                      <td>
                        <PermChips perms={permsOf(inv.role, inv.modulePermissions)} />
                      </td>
                      <td>{invitePill(inv)}</td>
                      {canManageTeam && <td>{resendButton(inv)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="hint" style={{ marginTop: 14 }}>
            Le super administrateur a tous les droits. Le compte fondateur ne peut être ni
            rétrogradé, ni suspendu, ni supprimé.
          </p>
        </>
      ) : (
        <>
          <p className="bo-sub" style={{ marginBottom: 16 }}>
            Chaque rôle donne, module par module : aucun accès, lecture seule ou gérer. Les accès
            d&rsquo;un administrateur ou d&rsquo;un membre du support se personnalisent ensuite dans
            l&rsquo;onglet Membres.
          </p>
          <div className="role-grid">
            {ROLE_CARDS.map((r) => (
              <article key={r.key} className="role-card">
                <header>
                  <h3>{r.title}</h3>
                  <span className="hint">
                    {dash ? '—' : roleCount(r.key)} membre(s) · {r.desc}
                  </span>
                </header>
                <PermChips perms={r.perms} />
                {r.sensitive.length > 0 && (
                  <div>
                    <span className="perm-head">
                      <ShieldCheck size={13} /> Actions sensibles
                    </span>
                    <ul className="role-sensitive">
                      {r.sensitive.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {canManageTeam && r.key !== 'SUPERADMIN' && (
                  <footer>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setInviteRole(r.key === 'SUPPORT' ? 'SUPPORT' : 'ADMIN')}
                    >
                      <UserCheck size={14} /> Inviter avec ce rôle
                    </button>
                  </footer>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {inviteRole && (
        <InviteMemberModal
          canInviteSuperadmin={isSuperadmin}
          initialRole={inviteRole}
          onClose={() => setInviteRole(null)}
          onSent={() => {
            setInviteRole(null);
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
