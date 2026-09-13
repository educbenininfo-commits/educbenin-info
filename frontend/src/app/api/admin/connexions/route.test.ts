// GET /api/admin/connexions — SUPERADMIN-only paginated feed of
// auth.login/auth.logout AdminAction rows. Pattern mirrors
// src/app/api/admin/audit-log/route.test.ts.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies } from '@/test-utils/mock-cookies';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

mockNextCookies();

vi.mock('@/lib/server/middleware', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { GET } from './route';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockEnforceRateLimit = vi.mocked(enforceAdminRateLimit);

const superadminCtx = {
  user: { sub: 'superadmin-1', email: 'super@test.local' },
  admin: { id: 'superadmin-1', email: 'super@test.local', role: 'SUPERADMIN' as const },
};

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function row(overrides: Partial<{ id: string; action: string; actorId: string }> = {}) {
  return {
    id: overrides.id ?? 'a-1',
    actorId: overrides.actorId ?? 'admin-1',
    action: overrides.action ?? 'auth.login',
    metadata: { email: 'admin@test.local', name: 'Admin One' },
    ip: '127.0.0.1',
    userAgent: 'jest',
    createdAt: new Date('2026-05-01T00:00:00Z'),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(superadminCtx);
  mockEnforceRateLimit.mockResolvedValue(null);
});

describe('GET /api/admin/connexions', () => {
  it('returns 401/403 when requireAdmin bails (forwards the response)', async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(makeGet('http://test/api/admin/connexions'));
    expect(res.status).toBe(403);
    expect(prismaMock.adminAction.findMany).not.toHaveBeenCalled();
  });

  it('gates on SUPERADMIN — requireAdmin is called with SUPERADMIN, not ADMIN', async () => {
    prismaMock.adminAction.findMany.mockResolvedValue([] as never);
    await GET(makeGet('http://test/api/admin/connexions'));
    expect(mockRequireAdmin).toHaveBeenCalledWith('SUPERADMIN');
  });

  it('returns 429 when rate-limit gate fires before any DB call', async () => {
    mockEnforceRateLimit.mockResolvedValueOnce(
      NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 }),
    );
    const res = await GET(makeGet('http://test/api/admin/connexions'));
    expect(res.status).toBe(429);
    expect(prismaMock.adminAction.findMany).not.toHaveBeenCalled();
  });

  it('filters action IN [auth.login, auth.logout]', async () => {
    prismaMock.adminAction.findMany.mockResolvedValue([] as never);
    await GET(makeGet('http://test/api/admin/connexions'));
    const args = prismaMock.adminAction.findMany.mock.calls[0]?.[0];
    expect(args?.where?.action).toEqual({ in: ['auth.login', 'auth.logout'] });
  });

  it('returns paginated items with metadata (name/email), ip, userAgent', async () => {
    prismaMock.adminAction.findMany.mockResolvedValue([row()] as never);
    const res = await GET(makeGet('http://test/api/admin/connexions'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      action: 'auth.login',
      metadata: { email: 'admin@test.local', name: 'Admin One' },
      ip: '127.0.0.1',
    });
  });

  it('orderBy [createdAt desc, id desc] + take limit+1', async () => {
    prismaMock.adminAction.findMany.mockResolvedValue([] as never);
    await GET(makeGet('http://test/api/admin/connexions?limit=20'));
    const args = prismaMock.adminAction.findMany.mock.calls[0]?.[0];
    expect(args?.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args?.take).toBe(21);
  });

  it('response includes x-request-id header', async () => {
    prismaMock.adminAction.findMany.mockResolvedValue([] as never);
    const res = await GET(makeGet('http://test/api/admin/connexions'));
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});

describe('source invariants', () => {
  it("route source contains runtime='nodejs', requireAdmin('SUPERADMIN'), enforceAdminRateLimit, prisma.adminAction.findMany, withRequestContext", () => {
    const src = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
    expect(src).toMatch(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/);
    expect(src).toContain("requireAdmin('SUPERADMIN')");
    expect(src).toContain('enforceAdminRateLimit');
    expect(src).toContain('prisma.adminAction.findMany');
    expect(src).toContain('withRequestContext');
  });
});
