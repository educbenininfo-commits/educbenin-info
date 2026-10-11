import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireSuperadmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/admin/audit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server/upload/supabase-storage-client', () => ({
  downloadObject: vi.fn().mockResolvedValue(null),
}));

import { requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { downloadObject } from '@/lib/server/upload/supabase-storage-client';
import { logAdminAction } from '@/lib/server/admin/audit';
import { GET } from './route';
import { seedSuperadmin } from '@/test-utils/admin-fixtures';

const mockRequireSuperadmin = vi.mocked(requireSuperadmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);
const mockDownloadObject = vi.mocked(downloadObject);
const mockLogAdminAction = vi.mocked(logAdminAction);

const superadminUser = seedSuperadmin({ id: 'superadmin_1', email: 'superadmin@test.local' });
const superadminCtx = {
  user: { sub: superadminUser.id, email: superadminUser.email },
  admin: { id: superadminUser.id, email: superadminUser.email, role: 'SUPERADMIN' as const },
};

function paramsOf(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}
function makeReq(id: string): NextRequest {
  return new NextRequest(`http://test/api/admin/dossiers/${id}/export`);
}

const dossier = {
  id: 'd1',
  reference: 'EB-2026-000401',
  nom: 'Sossou',
  prenom: 'Théodore',
  whatsapp: '+22996000000',
  nationalite: 'BJ',
  specialtyCodes: ['CAR'],
  stage: 2,
  motifRejet: null,
  montant: 50000,
  montantSupplement: null,
  paye: 50000,
  moyen: 'Mobile Money',
  authFormData: null,
  pieceJointeUrl: 'dossiers/EB-2026-000401/piece-jointe',
  diplomaBacUrl: null,
  diplomaBacTranslatedUrl: null,
  diplomaDoctoratUrl: null,
  diplomaDoctoratTranslatedUrl: null,
  ficheUrl: null,
  recepisseUrl: null,
  createdAt: new Date('2026-10-01T09:00:00Z'),
  stageChangedAt: new Date('2026-10-03T09:00:00Z'),
  ecole: { nom: 'FSS' },
  categorie: { libelle: 'Probatoire spécialité (D.E.S.)', libelleCourt: 'D.E.S.' },
  filiere: null,
  comments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSuperadmin.mockResolvedValue(superadminCtx);
  mockRateLimit.mockResolvedValue(null);
  mockDownloadObject.mockResolvedValue(null);
});

describe('GET /api/admin/dossiers/[id]/export', () => {
  it('requires SUPERADMIN', async () => {
    mockRequireSuperadmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(makeReq('d1'), paramsOf('d1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when the dossier does not exist', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeReq('missing'), paramsOf('missing'));
    expect(res.status).toBe(404);
  });

  it('streams a zip with Content-Type application/zip and a filename matching the reference, and logs dossier.zip_export', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(dossier as never);
    mockDownloadObject.mockImplementation(async (path) =>
      path === 'dossiers/EB-2026-000401/piece-jointe' ? Buffer.from('%PDF-1.4') : null,
    );

    const res = await GET(makeReq('d1'), paramsOf('d1'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
    expect(res.headers.get('Content-Disposition')).toContain('dossier-EB-2026-000401.zip');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(0);
    // A ZIP file's local-file-header magic bytes.
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'dossier.zip_export',
        targetType: 'Dossier',
        targetId: 'd1',
        metadata: expect.objectContaining({ files: ['piece-jointe.pdf'] }),
      }),
    );
  });
  it('includes the filled forms as PDFs and the attachments under pieces-jointes/', async () => {
    const authFormData = {
      nom: 'Sossou',
      prenom: 'Théodore',
      naissance: '1990-01-01',
      lieuNaissance: 'Cotonou',
      nationalite: 'FR',
      adresse: 'Paris',
      piece: 'Passeport',
      pieceRef: 'P123',
      email: 't@example.com',
      tel: '+33600000000',
      bac: {
        institution: 'Lycée',
        email: 'l@example.com',
        annee: '2008',
        pays: 'FR',
        adresse: 'Lyon',
      },
      doctorat: {
        institution: 'Univ',
        email: 'u@example.com',
        annee: '2016',
        pays: 'FR',
        adresse: 'Lyon',
      },
    };
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      ...dossier,
      authFormData,
      comments: [
        { type: 'public', authorName: 'Équipe', text: 'Dossier complet', createdAt: new Date() },
      ],
    } as never);
    mockDownloadObject.mockImplementation(async (path) =>
      path === 'dossiers/EB-2026-000401/piece-jointe' ? Buffer.from('%PDF-1.4') : null,
    );

    const res = await GET(makeReq('d1'), paramsOf('d1'));
    const zip = Buffer.from(await res.arrayBuffer()).toString('latin1');

    // ZIP entry names are stored uncompressed in the local/central headers.
    expect(zip).toContain('01-formulaire-demande.pdf');
    expect(zip).toContain('02-formulaire-authentification.pdf');
    expect(zip).toContain('03-recapitulatif.pdf');
    expect(zip).toContain('pieces-jointes/piece-jointe.pdf');
  });

  it('omits the authentication form when the candidate never submitted it', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(dossier as never);
    const res = await GET(makeReq('d1'), paramsOf('d1'));
    const zip = Buffer.from(await res.arrayBuffer()).toString('latin1');
    expect(zip).toContain('01-formulaire-demande.pdf');
    expect(zip).not.toContain('02-formulaire-authentification.pdf');
  });
});
