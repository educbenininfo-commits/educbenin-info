import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

function makePatch(body: unknown): NextRequest {
  return new NextRequest('http://test/api/admin/site-display', {
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

describe('GET /api/admin/site-display', () => {
  it('defaults to the bottom bar when nothing is saved', async () => {
    prismaMock.siteSettings.findUnique.mockResolvedValueOnce(null);
    expect(await (await GET()).json()).toEqual({ settings: { publicNavMode: 'bottom' } });
  });
});

describe('PATCH /api/admin/site-display', () => {
  it('saves a valid mode and audits the change', async () => {
    prismaMock.siteSettings.findUnique.mockResolvedValueOnce(null);
    prismaMock.siteSettings.upsert.mockResolvedValueOnce({} as never);

    const res = await PATCH(makePatch({ publicNavMode: 'top-right' }));

    expect(res.status).toBe(200);
    expect(prismaMock.siteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { publicNavMode: 'top-right' } }),
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'site.display_update' }),
    );
  });

  it('rejects an unknown mode', async () => {
    const res = await PATCH(makePatch({ publicNavMode: 'middle' }));
    expect(res.status).toBe(400);
    expect(prismaMock.siteSettings.upsert).not.toHaveBeenCalled();
  });
});
