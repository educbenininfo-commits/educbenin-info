import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/middleware/require-module-permission', () => ({
  requireModulePermission: vi.fn(),
}));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({ enforceAdminRateLimit: vi.fn() }));
vi.mock('@/lib/server/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth');
  return { ...actual, verifyCsrf: vi.fn() };
});
vi.mock('@/lib/server/admin/audit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

import { requireModulePermission } from '@/lib/server/middleware/require-module-permission';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { CATEGORIE_FSS_DES_ID } from '@/lib/server/schools/reference-ids';
import { POST } from './route';

const adminCtx = {
  user: { sub: 'admin_1', email: 'admin@test.local' },
  admin: { id: 'admin_1', email: 'admin@test.local', role: 'SUPERADMIN' as const },
};

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://test/api/admin/tarifs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireModulePermission).mockResolvedValue(adminCtx as never);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(verifyCsrf).mockReturnValue(null);
  prismaMock.categorie.findMany.mockResolvedValue([{ id: CATEGORIE_FSS_DES_ID }] as never);
  prismaMock.tarifBareme.create.mockResolvedValue({ id: 'bar_1' } as never);
  prismaMock.$transaction.mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock),
  );
});

describe('POST /api/admin/tarifs', () => {
  it('saves the per-specialty supplement and applies it to the D.E.S. category', async () => {
    const res = await POST(
      makePost({ mode: 'unique', montantUnique: 50000, supplementSpecialite: 30000 }),
    );

    expect(res.status).toBe(201);
    expect(prismaMock.tarifBareme.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ supplementSpecialite: 30000 }),
    });
    expect(prismaMock.categorie.update).toHaveBeenCalledWith({
      where: { id: CATEGORIE_FSS_DES_ID },
      data: { supplementSpecialite: 30000 },
    });
  });

  it('leaves the supplement untouched when the field is not sent', async () => {
    const res = await POST(makePost({ mode: 'unique', montantUnique: 50000 }));

    expect(res.status).toBe(201);
    expect(prismaMock.categorie.update).not.toHaveBeenCalled();
  });

  it('rejects a negative supplement', async () => {
    const res = await POST(
      makePost({ mode: 'unique', montantUnique: 50000, supplementSpecialite: -1 }),
    );
    expect(res.status).toBe(400);
  });
});
