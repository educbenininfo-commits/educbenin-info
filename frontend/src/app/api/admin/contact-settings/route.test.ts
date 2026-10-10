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
  return new NextRequest('http://test/api/admin/contact-settings', {
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

describe('GET /api/admin/contact-settings', () => {
  it('falls back to the built-in defaults when nothing is saved yet', async () => {
    prismaMock.siteSettings.findUnique.mockResolvedValueOnce(null);

    const res = await GET();

    expect(await res.json()).toEqual({
      settings: { email: 'educbenininfo@gmail.com', whatsapp: '+22967249837' },
    });
  });
});

describe('PATCH /api/admin/contact-settings', () => {
  it('normalizes the number to E.164, upserts the single row, and audits the change', async () => {
    prismaMock.siteSettings.findUnique.mockResolvedValueOnce(null);
    prismaMock.siteSettings.upsert.mockResolvedValueOnce({} as never);

    const res = await PATCH(
      makePatch({ email: 'Contact@Educbenin.info', whatsapp: '+229 01 97 00 00 00' }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      settings: { email: 'contact@educbenin.info', whatsapp: '+2290197000000' },
    });
    expect(prismaMock.siteSettings.upsert).toHaveBeenCalledWith({
      where: { id: 'site' },
      create: {
        id: 'site',
        contactEmail: 'contact@educbenin.info',
        contactWhatsapp: '+2290197000000',
      },
      update: { contactEmail: 'contact@educbenin.info', contactWhatsapp: '+2290197000000' },
    });
    expect(logAdminAction).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({ action: 'site.contact_update', targetId: 'site' }),
    );
  });

  it('accepts the legacy 8-digit Bénin number the site started with', async () => {
    prismaMock.siteSettings.findUnique.mockResolvedValueOnce(null);
    prismaMock.siteSettings.upsert.mockResolvedValueOnce({} as never);

    const res = await PATCH(makePatch({ email: 'a@b.co', whatsapp: '+229 67 24 98 37' }));

    expect(res.status).toBe(200);
    expect((await res.json()).settings.whatsapp).toBe('+22967249837');
  });

  it('rejects an invalid phone number', async () => {
    const res = await PATCH(makePatch({ email: 'a@b.co', whatsapp: '+229 12' }));

    expect(res.status).toBe(400);
    expect(prismaMock.siteSettings.upsert).not.toHaveBeenCalled();
  });

  it('rejects an invalid e-mail', async () => {
    const res = await PATCH(makePatch({ email: 'pas-un-email', whatsapp: '+2290197000000' }));

    expect(res.status).toBe(400);
  });
});
