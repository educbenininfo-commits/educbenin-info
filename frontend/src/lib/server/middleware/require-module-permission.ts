// Per-module permission gate for the Comptes admin & rôles screen. Sits on
// top of requireAdmin() (untouched, protected file) rather than extending
// its select — a SUPERADMIN always has full access regardless of
// User.modulePermissions; only an ADMIN-rank actor's grid is consulted, via
// one extra lightweight query here rather than widening requireAdmin's
// shared select for every caller.
import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { requireAdmin } from './index';
import type { AdminContext } from './index';

export type ModuleKey = 'dossiers' | 'dossiersRejetes' | 'specialites' | 'tarifs' | 'comptesAdmin';
export type PermLevel = 'manage' | 'read' | 'none';
export type ModulePermissions = Record<ModuleKey, PermLevel>;

const PERM_RANK: Record<PermLevel, number> = { none: 0, read: 1, manage: 2 };

export function permRank(level: PermLevel): number {
  return PERM_RANK[level];
}

export async function requireModulePermission(
  authHeader: string | null | undefined,
  moduleKey: ModuleKey,
  minLevel: 'read' | 'manage',
): Promise<AdminContext | NextResponse> {
  const auth = await requireAdmin('ADMIN', authHeader);
  if (auth instanceof NextResponse) return auth;
  if (auth.admin.role === 'SUPERADMIN') return auth;

  const row = await prisma.user.findUnique({
    where: { id: auth.admin.id },
    select: { modulePermissions: true },
  });
  const perms = (row?.modulePermissions as ModulePermissions | null) ?? null;
  const level = perms?.[moduleKey] ?? 'none';
  if (permRank(level) < permRank(minLevel)) {
    return NextResponse.json(
      { error: 'MODULE_PERMISSION_REQUIRED', message: 'Insufficient module permission' },
      { status: 403 },
    );
  }
  return auth;
}
