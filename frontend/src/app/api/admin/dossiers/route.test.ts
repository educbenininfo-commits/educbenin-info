import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { GET } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);

const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makeReq(qs = ''): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

// The route fires findMany + two groupBy calls (stage-scoped, then
// ecoleId-scoped) + ecole.findMany in one Promise.all — default every
// mock to an empty/no-op shape so a test only needs to override what it
// actually asserts on.
beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
  prismaMock.dossier.findMany.mockResolvedValue([] as never);
  vi.mocked(prismaMock.dossier.groupBy).mockResolvedValue([] as never);
  prismaMock.ecole.findMany.mockResolvedValue([] as never);
});

describe('GET /api/admin/dossiers', () => {
  it('defaults to stage >= 1 (excludes rejected) and returns counts for every bucket', async () => {
    prismaMock.dossier.findMany.mockResolvedValueOnce([
      {
        id: 'd1',
        reference: 'EB-202609-001',
        nom: 'HOUNGBO',
        prenom: 'Estelle',
        specialtyCodes: ['PED'],
        stage: 1,
        stageChangedAt: new Date('2026-09-01T00:00:00Z'),
        ecoleId: 'ecole-fss',
        ecole: { nom: 'FSS' },
        categorieId: 'cat-fss-des',
        categorie: { libelle: 'Probatoire spécialité (D.E.S.)', libelleCourt: 'D.E.S.' },
      },
    ] as never);
    vi.mocked(prismaMock.dossier.groupBy)
      // 1st call: stage-scoped groupBy
      .mockResolvedValueOnce([
        { stage: 0, _count: { _all: 2 } },
        { stage: 1, _count: { _all: 3 } },
        { stage: 2, _count: { _all: 1 } },
      ] as never)
      // 2nd call: ecoleId-scoped groupBy
      .mockResolvedValueOnce([{ ecoleId: 'ecole-fss', _count: { _all: 4 } }] as never);
    prismaMock.ecole.findMany.mockResolvedValueOnce([{ id: 'ecole-fss', nom: 'FSS' }] as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: { ecoleNom: string; categorieLabel: string }[];
      counts: Record<string, number>;
      ecoleCounts: Record<string, number>;
    };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ ecoleNom: 'FSS', categorieLabel: 'D.E.S.' });
    expect(body.counts).toEqual({ all: 4, '1': 3, '2': 1, '3': 0, '4': 0, '5': 0 });
    expect(body.ecoleCounts).toEqual({ all: 4, 'ecole-fss': 4 });

    const args = prismaMock.dossier.findMany.mock.calls[0]?.[0];
    expect(args?.where).toEqual({ stage: { gte: 1 } });
  });

  it('filters by an explicit stage, including stage=0 for rejected dossiers', async () => {
    await GET(makeReq('stage=0'));
    const args = prismaMock.dossier.findMany.mock.calls[0]?.[0];
    expect(args?.where).toEqual({ stage: 0 });
  });

  it('filters by ecoleId and scopes the stage-count groupBy to it', async () => {
    await GET(makeReq('ecoleId=ecole-inmes'));
    const findManyArgs = prismaMock.dossier.findMany.mock.calls[0]?.[0];
    expect(findManyArgs?.where).toEqual({ stage: { gte: 1 }, ecoleId: 'ecole-inmes' });

    const groupByArgs = vi.mocked(prismaMock.dossier.groupBy).mock.calls[0]?.[0];
    expect(groupByArgs?.where).toEqual({ ecoleId: 'ecole-inmes', stage: { gte: 1 } });
  });

  it('propagates 403 from requireAdmin without querying Prisma', async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
    expect(prismaMock.dossier.findMany).not.toHaveBeenCalled();
  });

  it('propagates 429 from the admin rate limiter', async () => {
    mockRateLimit.mockResolvedValueOnce(
      NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
    expect(prismaMock.dossier.findMany).not.toHaveBeenCalled();
  });
});
