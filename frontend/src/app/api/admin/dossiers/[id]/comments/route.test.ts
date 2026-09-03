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
import { POST } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const mockVerifyCsrf = vi.mocked(verifyCsrf);
const mockLogAdminAction = vi.mocked(logAdminAction);
const adminUser = seedAdmin({ id: 'admin_1', email: 'chimene@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makeReq(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}/comments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
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

describe('POST /api/admin/dossiers/[id]/comments', () => {
  it('creates a comment with authorName from the admin session, ignoring any authorName in the body', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({ id: 'd1' } as never);
    prismaMock.dossierComment.create.mockResolvedValueOnce({
      id: 'c1',
      dossierId: 'd1',
      type: 'public',
      text: 'Merci de vérifier...',
      authorName: 'chimene@test.local',
    } as never);

    const res = await POST(
      makeReq('d1', {
        type: 'public',
        text: 'Merci de vérifier...',
        authorName: 'spoofed@evil.local',
      }),
      paramsOf('d1'),
    );

    expect(res.status).toBe(201);
    expect(prismaMock.dossierComment.create).toHaveBeenCalledWith({
      data: {
        dossierId: 'd1',
        type: 'public',
        text: 'Merci de vérifier...',
        authorName: 'chimene@test.local',
      },
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'dossier.comment_add',
        targetType: 'Dossier',
        targetId: 'd1',
      }),
    );
  });

  it('accepts type "internal"', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({ id: 'd1' } as never);
    prismaMock.dossierComment.create.mockResolvedValueOnce({ id: 'c1' } as never);
    const res = await POST(
      makeReq('d1', { type: 'internal', text: 'note interne' }),
      paramsOf('d1'),
    );
    expect(res.status).toBe(201);
  });

  it('rejects an unknown type', async () => {
    const res = await POST(makeReq('d1', { type: 'secret', text: 'x' }), paramsOf('d1'));
    expect(res.status).toBe(400);
    expect(prismaMock.dossierComment.create).not.toHaveBeenCalled();
  });

  it('rejects empty text', async () => {
    const res = await POST(makeReq('d1', { type: 'public', text: '' }), paramsOf('d1'));
    expect(res.status).toBe(400);
  });

  it('returns 404 DOSSIER_NOT_FOUND for an unknown dossier id', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeReq('missing', { type: 'public', text: 'x' }), paramsOf('missing'));
    expect(res.status).toBe(404);
    expect(prismaMock.dossierComment.create).not.toHaveBeenCalled();
  });
});
