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
import { POST } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const mockVerifyCsrf = vi.mocked(verifyCsrf);
const mockLogAdminAction = vi.mocked(logAdminAction);
const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makeReq(id: string): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}/auth-send`, { method: 'POST' });
}
function paramsOf(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
  mockVerifyCsrf.mockReturnValue(null);
});

describe('POST /api/admin/dossiers/[id]/auth-send', () => {
  it('generates a token, sets a 30-day expiry, and stamps authSentAt on a stage-2 unsent dossier', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage: 2,
      authSentAt: null,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({} as never);

    const before = Date.now();
    const res = await POST(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; authTokenExpiresAt: string };
    expect(body.token.length).toBeGreaterThan(20);

    const updateArg = prismaMock.dossier.update.mock.calls[0]?.[0];
    expect(updateArg?.where).toEqual({ id: 'd1' });
    expect(updateArg?.data?.authToken).toBe(body.token);
    expect(updateArg?.data?.authSentAt).toBeInstanceOf(Date);
    const expiresAt = updateArg?.data?.authTokenExpiresAt as Date;
    expect(expiresAt.getTime() - before).toBeGreaterThan(29 * 24 * 3600 * 1000);
    expect(expiresAt.getTime() - before).toBeLessThan(31 * 24 * 3600 * 1000);

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'dossier.auth_send',
        targetType: 'Dossier',
        targetId: 'd1',
      }),
    );
  });

  it('returns 409 WRONG_STAGE outside stage 2', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage: 1,
      authSentAt: null,
    } as never);
    const res = await POST(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('WRONG_STAGE');
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it('returns 409 ALREADY_SENT when authSentAt is already set', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      stage: 2,
      authSentAt: new Date(),
    } as never);
    const res = await POST(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('ALREADY_SENT');
  });

  it('returns 404 DOSSIER_NOT_FOUND for an unknown id', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeReq('missing'), paramsOf('missing'));
    expect(res.status).toBe(404);
  });

  it('rejects when CSRF fails', async () => {
    mockVerifyCsrf.mockReturnValueOnce(
      NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }),
    );
    const res = await POST(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(403);
    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });
});
