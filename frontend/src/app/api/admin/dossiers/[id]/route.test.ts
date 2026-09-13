// frontend/src/app/api/admin/dossiers/[id]/route.test.ts
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn(), requireSuperadmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth');
  return { ...actual, verifyCsrf: vi.fn() };
});
vi.mock('@/lib/server/admin/audit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server/upload/supabase-storage-client', () => ({
  deleteObject: vi.fn().mockResolvedValue(undefined),
  signedUrl: vi.fn((path: string | null) =>
    Promise.resolve(path ? `https://signed.test/${path}` : null),
  ),
}));

import { requireAdmin, requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { deleteObject } from '@/lib/server/upload/supabase-storage-client';
import { GET, PATCH, DELETE } from './route';
import { seedAdmin, seedSuperadmin } from '@/test-utils/admin-fixtures';

const mockVerifyCsrf = vi.mocked(verifyCsrf);
const mockLogAdminAction = vi.mocked(logAdminAction);
const mockDeleteObject = vi.mocked(deleteObject);

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRequireSuperadmin = vi.mocked(requireSuperadmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};
const superadminUser = seedSuperadmin({ id: 'superadmin_1', email: 'superadmin@test.local' });
const superadminCtx = {
  user: { sub: superadminUser.id, email: superadminUser.email },
  admin: { id: superadminUser.id, email: superadminUser.email, role: 'SUPERADMIN' as const },
};

function makeReq(id: string): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}`, { method: 'GET' });
}
function paramsOf(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRequireSuperadmin.mockResolvedValue(superadminCtx);
  mockRateLimit.mockResolvedValue(null);
  mockVerifyCsrf.mockReturnValue(null);
});

describe('GET /api/admin/dossiers/[id]', () => {
  it('returns the full dossier with comments ordered oldest-first', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      reference: 'EB-202609-001',
      comments: [{ id: 'c1', type: 'public', text: 'hi', authorName: 'a@test.local' }],
    } as never);

    const res = await GET(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { dossier: { id: string } };
    expect(body.dossier.id).toBe('d1');

    expect(prismaMock.dossier.findUnique).toHaveBeenCalledWith({
      where: { id: 'd1' },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
  });

  it('returns 404 DOSSIER_NOT_FOUND when the id does not exist', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeReq('missing'), paramsOf('missing'));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('DOSSIER_NOT_FOUND');
  });

  it('propagates 403 from requireAdmin', async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(403);
    expect(prismaMock.dossier.findUnique).not.toHaveBeenCalled();
  });
});

function makePatchReq(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/dossiers/[id]', () => {
  it('updates paye and moyen, clamping paye to montant when montant is unchanged', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      montant: 50000,
      montantSupplement: null,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({ id: 'd1', paye: 50000 } as never);

    const res = await PATCH(
      makePatchReq('d1', { paye: 999999, moyen: 'Mobile Money' }),
      paramsOf('d1'),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { paye: 50000, moyen: 'Mobile Money' },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'dossier.payment_update',
        targetType: 'Dossier',
        targetId: 'd1',
      }),
    );
  });

  it('clamps paye against montant + montantSupplement when both are set in the same request', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      montant: 50000,
      montantSupplement: null,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({} as never);

    await PATCH(
      makePatchReq('d1', { montant: 50000, montantSupplement: 50000, paye: 80000 }),
      paramsOf('d1'),
    );

    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { montant: 50000, montantSupplement: 50000, paye: 80000 },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
  });

  it('clamps a negative paye to 0', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'd1',
      montant: 50000,
      montantSupplement: null,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({} as never);

    await PATCH(makePatchReq('d1', { paye: -100 }), paramsOf('d1'));

    expect(prismaMock.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { paye: 0 },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
  });

  it('returns 404 DOSSIER_NOT_FOUND when the id does not exist', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makePatchReq('missing', { paye: 1000 }), paramsOf('missing'));
    expect(res.status).toBe(404);
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it('rejects when CSRF fails — short-circuits before requireAdmin', async () => {
    mockVerifyCsrf.mockReturnValueOnce(
      NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }),
    );
    const res = await PATCH(makePatchReq('d1', { paye: 1000 }), paramsOf('d1'));
    expect(res.status).toBe(403);
    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });

  it('rejects an unknown moyen value with 400 VALIDATION_FAILED', async () => {
    const res = await PATCH(makePatchReq('d1', { moyen: 'Chèque' }), paramsOf('d1'));
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.findUnique).not.toHaveBeenCalled();
  });
});

function makeDeleteReq(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fullDossier = {
  id: 'd1',
  reference: 'EB-2026-000401',
  nom: 'Sossou',
  prenom: 'Théodore',
  whatsapp: '+22996000000',
  stage: 2,
  specialtyCodes: ['CAR'],
  pieceJointeUrl: 'dossiers/EB-2026-000401/piece-jointe',
  diplomaBacUrl: 'dossiers/EB-2026-000401/diplome-bac',
  diplomaDoctoratUrl: null,
  diplomaBacTranslatedUrl: null,
  diplomaDoctoratTranslatedUrl: null,
  ficheUrl: null,
  recepisseUrl: null,
} as never;

describe('DELETE /api/admin/dossiers/[id]', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation((cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
      }
      return Promise.resolve(cb);
    });
  });

  it('requires SUPERADMIN — an ADMIN gets 403 from requireSuperadmin, never reaches the DB', async () => {
    mockRequireSuperadmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await DELETE(
      makeDeleteReq('d1', { confirmReference: 'EB-2026-000401' }),
      paramsOf('d1'),
    );
    expect(res.status).toBe(403);
    expect(prismaMock.dossier.findUnique).not.toHaveBeenCalled();
  });

  it('rejects when CSRF fails — short-circuits before requireSuperadmin', async () => {
    mockVerifyCsrf.mockReturnValueOnce(
      NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }),
    );
    const res = await DELETE(
      makeDeleteReq('d1', { confirmReference: 'EB-2026-000401' }),
      paramsOf('d1'),
    );
    expect(res.status).toBe(403);
    expect(mockRequireSuperadmin).not.toHaveBeenCalled();
  });

  it('returns 404 DOSSIER_NOT_FOUND when the id does not exist', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await DELETE(
      makeDeleteReq('missing', { confirmReference: 'EB-2026-000401' }),
      paramsOf('missing'),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('DOSSIER_NOT_FOUND');
  });

  it('returns 400 REFERENCE_MISMATCH when confirmReference does not match exactly', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(fullDossier);
    const res = await DELETE(
      makeDeleteReq('d1', { confirmReference: 'EB-2026-000402' }),
      paramsOf('d1'),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('REFERENCE_MISMATCH');
    expect(prismaMock.dossier.delete).not.toHaveBeenCalled();
  });

  it('deletes every stored file, then the comments and dossier row, and logs dossier.delete', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(fullDossier);
    prismaMock.dossierComment.deleteMany.mockResolvedValueOnce({ count: 2 } as never);
    prismaMock.dossier.delete.mockResolvedValueOnce(fullDossier);

    const res = await DELETE(
      makeDeleteReq('d1', { confirmReference: 'EB-2026-000401' }),
      paramsOf('d1'),
    );

    expect(res.status).toBe(200);
    expect(mockDeleteObject).toHaveBeenCalledWith('dossiers/EB-2026-000401/piece-jointe');
    expect(mockDeleteObject).toHaveBeenCalledWith('dossiers/EB-2026-000401/diplome-bac');
    expect(mockDeleteObject).toHaveBeenCalledWith(null);
    expect(prismaMock.dossierComment.deleteMany).toHaveBeenCalledWith({
      where: { dossierId: 'd1' },
    });
    expect(prismaMock.dossier.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: 'superadmin_1',
        action: 'dossier.delete',
        targetType: 'Dossier',
        targetId: 'd1',
        metadata: expect.objectContaining({ reference: 'EB-2026-000401' }),
      }),
    );
  });

  it('rejects a request with no confirmReference with 400 VALIDATION_FAILED', async () => {
    const res = await DELETE(makeDeleteReq('d1', {}), paramsOf('d1'));
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.findUnique).not.toHaveBeenCalled();
  });
});
