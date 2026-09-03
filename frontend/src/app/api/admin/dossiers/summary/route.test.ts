import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({ enforceAdminRateLimit: vi.fn() }));

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

function makeReq(): NextRequest {
  return new NextRequest('http://test/api/admin/dossiers/summary', { method: 'GET' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
});

describe('GET /api/admin/dossiers/summary', () => {
  it('returns KPI counts for all 6 stages, defaulting missing stages to 0', async () => {
    vi.mocked(prismaMock.dossier.groupBy).mockResolvedValueOnce([
      { stage: 1, _count: { _all: 24 } },
      { stage: 5, _count: { _all: 58 } },
    ] as never);
    prismaMock.dossier.findMany.mockResolvedValueOnce([] as never); // enAttente
    prismaMock.dossier.findMany.mockResolvedValueOnce([] as never); // recent window

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { kpis: Record<string, number> };
    expect(body.kpis).toEqual({ '0': 0, '1': 24, '2': 0, '3': 0, '4': 0, '5': 58 });
  });

  it('queries enAttente with stage 1-4 + stageChangedAt older than 5 days, oldest first', async () => {
    vi.mocked(prismaMock.dossier.groupBy).mockResolvedValueOnce([] as never);
    prismaMock.dossier.findMany.mockResolvedValueOnce([] as never);
    prismaMock.dossier.findMany.mockResolvedValueOnce([] as never);

    await GET(makeReq());

    const enAttenteArgs = prismaMock.dossier.findMany.mock.calls[0]?.[0];
    expect(enAttenteArgs?.where).toMatchObject({ stage: { gte: 1, lte: 4 } });
    const stageChangedAt = (enAttenteArgs?.where as { stageChangedAt?: { lt?: Date } })
      ?.stageChangedAt;
    expect(stageChangedAt?.lt).toBeInstanceOf(Date);
    expect(enAttenteArgs?.orderBy).toEqual({ stageChangedAt: 'asc' });
  });

  it('builds activiteRecente from createdAt/authSubmittedAt/stageChangedAt, newest first, skipping a no-op stageChangedAt', async () => {
    const created = new Date('2026-09-01T00:00:00Z');
    vi.mocked(prismaMock.dossier.groupBy).mockResolvedValueOnce([] as never);
    prismaMock.dossier.findMany.mockResolvedValueOnce([] as never); // enAttente
    prismaMock.dossier.findMany.mockResolvedValueOnce([
      {
        id: 'd1',
        reference: 'EB-202609-001',
        nom: 'HOUNGBO',
        prenom: 'Estelle',
        createdAt: created,
        authSubmittedAt: new Date('2026-09-02T00:00:00Z'),
        stageChangedAt: new Date('2026-09-03T00:00:00Z'), // differs from createdAt → counts as an event
      },
      {
        id: 'd2',
        reference: 'EB-202609-002',
        nom: 'ADJOVI',
        prenom: 'Roméo',
        createdAt: created,
        authSubmittedAt: null,
        stageChangedAt: created, // same instant as createdAt → NOT a separate event
      },
    ] as never);

    const res = await GET(makeReq());
    const body = (await res.json()) as {
      activiteRecente: { dossierId: string; reference: string; label: string; at: string }[];
    };

    // d1 contributes 3 events, d2 contributes 1 (creation only) = 4 total, newest first.
    expect(body.activiteRecente).toHaveLength(4);
    expect(body.activiteRecente[0]).toMatchObject({ dossierId: 'd1', label: 'Statut modifié' });
    expect(body.activiteRecente[1]).toMatchObject({
      dossierId: 'd1',
      label: "Formulaire d'authentification reçu",
    });
    expect(
      body.activiteRecente.some((e) => e.dossierId === 'd2' && e.label === 'Nouveau dossier reçu'),
    ).toBe(true);
  });

  it('propagates 403 from requireAdmin without querying Prisma', async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
    expect(prismaMock.dossier.groupBy).not.toHaveBeenCalled();
  });
});
