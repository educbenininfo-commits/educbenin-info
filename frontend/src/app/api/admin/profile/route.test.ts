import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({ enforceAdminRateLimit: vi.fn() }));
vi.mock('@/lib/server/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth');
  return { ...actual, verifyCsrf: vi.fn() };
});
vi.mock('@/lib/server/admin/audit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { GET, PATCH } from './route';

const adminCtx = {
  user: { sub: 'admin_1', email: 'admin@test.local' },
  admin: { id: 'admin_1', email: 'admin@test.local', role: 'ADMIN' as const },
};

const profile = {
  name: 'Chimène',
  email: 'admin@test.local',
  role: 'ADMIN',
  createdAt: new Date('2026-09-01T00:00:00Z'),
};

function makePatch(body: unknown): NextRequest {
  return new NextRequest('http://test/api/admin/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue(adminCtx);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(verifyCsrf).mockReturnValue(null);
});

describe('GET /api/admin/profile', () => {
  it("returns the logged-in admin's own profile", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(profile as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).profile).toMatchObject({ name: 'Chimène', role: 'ADMIN' });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'admin_1' } }),
    );
  });

  it('rejects non-admins', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }),
    );
    expect((await GET()).status).toBe(403);
  });
});

describe('PATCH /api/admin/profile', () => {
  it('updates only the own display name and audits the change', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ name: null } as never);
    prismaMock.user.update.mockResolvedValueOnce({ ...profile, name: 'Chimène A.' } as never);

    const res = await PATCH(makePatch({ name: '  Chimène A.  ' }));

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'admin_1' }, data: { name: 'Chimène A.' } }),
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'admin.profile_update', targetId: 'admin_1' }),
    );
  });

  it('stores an empty name as null', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ name: 'Old' } as never);
    prismaMock.user.update.mockResolvedValueOnce({ ...profile, name: null } as never);
    await PATCH(makePatch({ name: '   ' }));
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: null } }),
    );
  });

  it('rejects an over-long name and a missing CSRF token', async () => {
    expect((await PATCH(makePatch({ name: 'x'.repeat(81) }))).status).toBe(400);
    vi.mocked(verifyCsrf).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 }),
    );
    expect((await PATCH(makePatch({ name: 'ok' }))).status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
