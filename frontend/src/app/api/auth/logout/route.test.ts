// Tests for POST /api/auth/logout (AUTH-05).
// Pattern 13. CSRF-gated mutating route (D-02).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { prismaMock } from '@/test-utils/prisma-mock';

mockNextCookies();

vi.mock('@/lib/server/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth');
  return {
    ...actual,
    verifyRefreshToken: vi.fn(),
  };
});

// Session revocation is exercised in sessions.test.ts — here it's a black box.
vi.mock('@/lib/server/auth/sessions', () => ({
  revokeSession: vi.fn().mockResolvedValue(true),
}));

// Admin login/logout notification+audit fan-out — exercised separately in
// auth-events.test.ts; here it's a black box we just assert is/isn't called.
vi.mock('@/lib/server/admin/auth-events', () => ({
  recordAdminAuthEvent: vi.fn().mockResolvedValue(undefined),
}));

import { verifyRefreshToken } from '@/lib/server/auth';
import { revokeSession } from '@/lib/server/auth/sessions';
import { recordAdminAuthEvent } from '@/lib/server/admin/auth-events';
import { POST } from './route';
import { NextRequest } from 'next/server';

function makeReq(
  opts: { csrfHeader?: string; csrfCookie?: string; refreshCookie?: string } = {},
): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.csrfHeader) headers['x-csrf-token'] = opts.csrfHeader;
  const cookieParts: string[] = [];
  if (opts.csrfCookie) cookieParts.push(`app-csrf=${opts.csrfCookie}`);
  if (opts.refreshCookie) cookieParts.push(`app-refresh=${opts.refreshCookie}`);
  if (cookieParts.length > 0) headers.cookie = cookieParts.join('; ');
  return new NextRequest('https://test/api/auth/logout', {
    method: 'POST',
    headers,
  });
}

beforeEach(() => {
  __cookieStore.clear();
  vi.mocked(verifyRefreshToken).mockReset();
  vi.mocked(revokeSession).mockReset();
  vi.mocked(revokeSession).mockResolvedValue(true);
  vi.mocked(recordAdminAuthEvent).mockReset();
  vi.mocked(recordAdminAuthEvent).mockResolvedValue(undefined);
  // Pre-populate cookies that logout should clear.
  __cookieStore.entries(); // touch to keep linter quiet
});

describe('POST /api/auth/logout', () => {
  it('Test 1: happy path — valid CSRF, clears all 3 cookies, returns ok', async () => {
    const csrf = 'matching-csrf-token-value';
    const res = await POST(makeReq({ csrfHeader: csrf, csrfCookie: csrf }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    // setAuthCookies + clearCsrfCookie write empty values with maxAge: 0.
    const tokenCookie = __cookieStore.get('app-token');
    const refreshCookie = __cookieStore.get('app-refresh');
    const csrfCookie = __cookieStore.get('app-csrf');
    expect(tokenCookie?.value).toBe('');
    expect(refreshCookie?.value).toBe('');
    expect(csrfCookie?.value).toBe('');
  });

  it('Test 2: no CSRF header — 403 with CSRF error', async () => {
    const res = await POST(makeReq({ csrfCookie: 'has-cookie-but-no-header' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/CSRF/i);
  });

  it('Test 3: CSRF mismatch — header != cookie → 403', async () => {
    const res = await POST(makeReq({ csrfHeader: 'a', csrfCookie: 'b' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/CSRF/i);
  });

  it('Test 4: USER logout with a valid refresh token — session revoked, no admin fan-out', async () => {
    vi.mocked(verifyRefreshToken).mockResolvedValue({ sub: 'u1', tokenVersion: 0, sid: 'sess-1' });
    prismaMock.user.findUnique.mockResolvedValue({
      email: 'a@b.com',
      name: null,
      role: 'USER',
    } as never);
    const csrf = 'matching-csrf-token-value';

    const res = await POST(makeReq({ csrfHeader: csrf, csrfCookie: csrf, refreshCookie: 'rt' }));

    expect(res.status).toBe(200);
    expect(revokeSession).toHaveBeenCalledWith('sess-1', 'u1');
    expect(recordAdminAuthEvent).not.toHaveBeenCalled();
  });

  it('Test 5: ADMIN logout with a valid refresh token — records the admin auth event (logout)', async () => {
    vi.mocked(verifyRefreshToken).mockResolvedValue({
      sub: 'u-admin',
      tokenVersion: 0,
      sid: 'sess-admin',
    });
    prismaMock.user.findUnique.mockResolvedValue({
      email: 'admin@b.com',
      name: 'Admin One',
      role: 'ADMIN',
    } as never);
    const csrf = 'matching-csrf-token-value';

    const res = await POST(makeReq({ csrfHeader: csrf, csrfCookie: csrf, refreshCookie: 'rt' }));

    expect(res.status).toBe(200);
    expect(recordAdminAuthEvent).toHaveBeenCalledTimes(1);
    expect(recordAdminAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u-admin',
        actorEmail: 'admin@b.com',
        actorName: 'Admin One',
        event: 'logout',
        sessionId: 'sess-admin',
      }),
    );
  });

  it('Test 6: revokeSession returns false (already revoked/unknown sid) — no admin fan-out', async () => {
    vi.mocked(verifyRefreshToken).mockResolvedValue({
      sub: 'u-admin',
      tokenVersion: 0,
      sid: 'sess-admin',
    });
    vi.mocked(revokeSession).mockResolvedValue(false);
    const csrf = 'matching-csrf-token-value';

    const res = await POST(makeReq({ csrfHeader: csrf, csrfCookie: csrf, refreshCookie: 'rt' }));

    expect(res.status).toBe(200);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(recordAdminAuthEvent).not.toHaveBeenCalled();
  });
});
