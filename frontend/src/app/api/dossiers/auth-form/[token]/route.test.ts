import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/upload/uploadPublicFile', () => ({
  uploadPublicFile: vi.fn(),
  CANDIDATE_DOCUMENT_MAX_BYTES: 5 * 1024 * 1024,
}));

import { GET, POST } from './route';
import { uploadPublicFile } from '@/lib/server/upload/uploadPublicFile';

const mockUploadPublicFile = vi.mocked(uploadPublicFile);

function makeReq(token: string): NextRequest {
  return new NextRequest(`http://test/api/dossiers/auth-form/${token}`, { method: 'GET' });
}
function paramsOf(token: string): { params: Promise<{ token: string }> } {
  return { params: Promise.resolve({ token }) };
}

describe('GET /api/dossiers/auth-form/[token]', () => {
  it('returns valid:true + reference + authFormData for a live, unfilled, stage-2 token', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);

    const res = await GET(makeReq('tok_live'), paramsOf('tok_live'));
    expect(await res.json()).toEqual({
      valid: true,
      reference: 'EB-202609-001',
      authFormData: null,
    });
  });

  it('returns the existing authFormData for prefill when a resend cleared authSubmittedAt', async () => {
    const existing = { nom: 'SOSSOU', prenom: 'Théodore' };
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: existing,
    } as never);

    const res = await GET(makeReq('tok_resend'), paramsOf('tok_resend'));
    expect((await res.json()).authFormData).toEqual(existing);
  });

  it('returns reason "invalid" when the token matches no dossier', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeReq('tok_missing'), paramsOf('tok_missing'));
    expect(await res.json()).toEqual({ valid: false, reason: 'invalid' });
  });

  it('returns reason "expired" when authTokenExpiresAt is in the past', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() - 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);
    const res = await GET(makeReq('tok_expired'), paramsOf('tok_expired'));
    expect(await res.json()).toEqual({ valid: false, reason: 'expired' });
  });

  it('returns reason "already-submitted" when authSubmittedAt is set', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: new Date(),
      authFormData: null,
    } as never);
    const res = await GET(makeReq('tok_done'), paramsOf('tok_done'));
    expect(await res.json()).toEqual({ valid: false, reason: 'already-submitted' });
  });

  it('returns reason "wrong-stage" when the dossier has moved past stage 2', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      reference: 'EB-202609-001',
      stage: 3,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);
    const res = await GET(makeReq('tok_wrongstage'), paramsOf('tok_wrongstage'));
    expect(await res.json()).toEqual({ valid: false, reason: 'wrong-stage' });
  });
});

function pdfFile(name: string): File {
  return new File([Buffer.from('%PDF-1.4')], name, { type: 'application/pdf' });
}

function authFormFields(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    nom: 'SOSSOU',
    prenom: 'Théodore',
    naissance: '14/03/1988',
    lieuNaissance: 'Cotonou, Bénin',
    nationalite: 'BJ',
    adresse: 'Fidjrossè, Cotonou, Bénin',
    piece: 'CNI',
    pieceRef: 'B-04422190',
    email: 'theodore.sossou@gmail.com',
    tel: '+22996123456',
    diplomeNonFrancais: 'false',
    'bac.institution': 'Office du Baccalauréat du Bénin',
    'bac.email': 'contact@obb.bj',
    'bac.annee': '2013',
    'bac.pays': 'BJ',
    'bac.adresse': 'Cotonou, Bénin',
    'doctorat.institution': 'FSS / UAC',
    'doctorat.email': 'scolarite@fss-uac.bj',
    'doctorat.annee': '2023',
    'doctorat.pays': 'BJ',
    'doctorat.adresse': 'Campus FSS, Cotonou, Bénin',
    ...overrides,
  };
}

function makePostReq(
  token: string,
  fields: Record<string, string> = authFormFields(),
  files: {
    documentsBac?: File | null;
    documentsDoctorat?: File | null;
    documentsBacTraduit?: File | null;
    documentsDoctoratTraduit?: File | null;
  } = {},
): NextRequest {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const documentsBac =
    files.documentsBac === undefined ? pdfFile('diplome-bac.pdf') : files.documentsBac;
  const documentsDoctorat =
    files.documentsDoctorat === undefined
      ? pdfFile('diplome-doctorat.pdf')
      : files.documentsDoctorat;
  if (documentsBac) fd.append('documentsBac', documentsBac);
  if (documentsDoctorat) fd.append('documentsDoctorat', documentsDoctorat);
  if (files.documentsBacTraduit) fd.append('documentsBacTraduit', files.documentsBacTraduit);
  if (files.documentsDoctoratTraduit) {
    fd.append('documentsDoctoratTraduit', files.documentsDoctoratTraduit);
  }
  return new NextRequest(`http://test/api/dossiers/auth-form/${token}`, {
    method: 'POST',
    body: fd,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUploadPublicFile.mockImplementation(async (_file, storagePath) => ({
    ok: true,
    path: storagePath,
    bytes: 1000,
  }));
});

describe('POST /api/dossiers/auth-form/[token]', () => {
  it('stores authFormData + both diploma document paths, capped at 5 MB each, and sets authSubmittedAt', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({} as never);

    const res = await POST(makePostReq('tok_live'), paramsOf('tok_live'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.any(File),
      'dossiers/EB-202609-001/diplome-sossou-theodore-bac',
      { maxBytes: 5 * 1024 * 1024 },
    );
    expect(mockUploadPublicFile).toHaveBeenCalledWith(
      expect.any(File),
      'dossiers/EB-202609-001/diplome-sossou-theodore-doctorat',
      { maxBytes: 5 * 1024 * 1024 },
    );

    const updateArg = prismaMock.dossier.update.mock.calls[0]?.[0];
    expect(updateArg?.where).toEqual({ id: 'dos_1' });
    expect(updateArg?.data).toMatchObject({
      diplomaBacUrl: 'dossiers/EB-202609-001/diplome-sossou-theodore-bac',
      diplomaDoctoratUrl: 'dossiers/EB-202609-001/diplome-sossou-theodore-doctorat',
      diplomaBacTranslatedUrl: null,
      diplomaDoctoratTranslatedUrl: null,
    });
    expect(updateArg?.data?.authSubmittedAt).toBeInstanceOf(Date);
    expect(updateArg?.data?.authFormData).toMatchObject({
      nom: 'SOSSOU',
      diplomeNonFrancais: false,
      bac: { institution: 'Office du Baccalauréat du Bénin' },
      doctorat: { institution: 'FSS / UAC' },
    });
  });

  it('uploads two extra translated files when diplomeNonFrancais=true', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);
    prismaMock.dossier.update.mockResolvedValueOnce({} as never);

    const res = await POST(
      makePostReq('tok_live', authFormFields({ diplomeNonFrancais: 'true' }), {
        documentsBacTraduit: pdfFile('bac-traduit.pdf'),
        documentsDoctoratTraduit: pdfFile('doctorat-traduit.pdf'),
      }),
      paramsOf('tok_live'),
    );

    expect(res.status).toBe(200);
    const updateArg = prismaMock.dossier.update.mock.calls[0]?.[0];
    expect(updateArg?.data).toMatchObject({
      diplomaBacTranslatedUrl: 'dossiers/EB-202609-001/diplome-sossou-theodore-bac-traduit',
      diplomaDoctoratTranslatedUrl:
        'dossiers/EB-202609-001/diplome-sossou-theodore-doctorat-traduit',
    });
  });

  it('returns 400 VALIDATION_FAILED when diplomeNonFrancais=true but a translated file is missing', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);

    const res = await POST(
      makePostReq('tok_live', authFormFields({ diplomeNonFrancais: 'true' })),
      paramsOf('tok_live'),
    );
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it('returns 404 TOKEN_INVALID for an unknown token, without touching the DB write path', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makePostReq('tok_missing'), paramsOf('tok_missing'));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('TOKEN_INVALID');
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it('returns 410 TOKEN_EXPIRED for an expired token', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() - 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);
    const res = await POST(makePostReq('tok_expired'), paramsOf('tok_expired'));
    expect(res.status).toBe(410);
    expect((await res.json()).error).toBe('TOKEN_EXPIRED');
  });

  it('returns 409 TOKEN_ALREADY_SUBMITTED when authSubmittedAt is already set', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: new Date(),
      authFormData: null,
    } as never);
    const res = await POST(makePostReq('tok_done'), paramsOf('tok_done'));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('TOKEN_ALREADY_SUBMITTED');
  });

  it('returns 409 TOKEN_WRONG_STAGE when the dossier has moved past stage 2', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 3,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);
    const res = await POST(makePostReq('tok_wrongstage'), paramsOf('tok_wrongstage'));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('TOKEN_WRONG_STAGE');
  });

  it('returns 400 VALIDATION_FAILED when a required field is blank', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);
    const res = await POST(
      makePostReq('tok_live', authFormFields({ nom: '' })),
      paramsOf('tok_live'),
    );
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_FAILED when the Bac document is missing', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);
    const res = await POST(
      makePostReq('tok_live', undefined, { documentsBac: null }),
      paramsOf('tok_live'),
    );
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_FAILED when the Doctorat document is missing', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      id: 'dos_1',
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
      authFormData: null,
    } as never);
    const res = await POST(
      makePostReq('tok_live', undefined, { documentsDoctorat: null }),
      paramsOf('tok_live'),
    );
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.update).not.toHaveBeenCalled();
  });
});
