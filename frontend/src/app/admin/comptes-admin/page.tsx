// Écran Comptes admin & rôles — docs/design-reference/DESIGN-SPEC.md,
// section "14. Comptes admin & rôles". Backed by real data since the
// invitations/roles/permissions feature: GET /api/admin/team merges active
// members and pending invitations; "+ Inviter un membre" opens a real modal
// (POST /api/admin/invites). See TeamList.tsx for the client logic.

import { TeamList } from '@/components/backoffice/comptes-admin/TeamList';

export default function ComptesAdminPage() {
  return <TeamList />;
}
