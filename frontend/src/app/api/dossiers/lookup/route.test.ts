import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function makeReq(qs: string): NextRequest {
  return new NextRequest(`http://test/api/dossiers/lookup?${qs}`, { method: 'GET' });
}

beforeEach(() => {
  // No vi.clearAllMocks() call needed here — prismaMock's own beforeEach
  // (registered in @/test-utils/prisma-mock) already resets it.
});

describe('GET /api/dossiers/lookup', () => {
  it('returns the public-safe subset for a matching reference+whatsapp pair', async () => {
    prismaMock.dossier.findFirst.mockResolvedValueOnce({
      reference: 'EB-202609-001',
      stage: 3,
      motifRejet: null,
      ficheUploaded: false,
      recepisseUploaded: false,
      recepisseUrl: null,
    } as never);

    const res = await GET(makeReq('reference=EB-202609-001&whatsapp=%2B229+97+00+00+00'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      reference: 'EB-202609-001',
      stage: 3,
      motifRejet: null,
      ficheUploaded: false,
      recepisseUrl: null,
    });
    expect(prismaMock.dossier.findFirst).toHaveBeenCalledWith({
      where: { reference: 'EB-202609-001', whatsapp: '+229 97 00 00 00' },
      select: expect.objectContaining({ stage: true }),
    });
  });

  it('returns motifRejet only when stage is 0', async () => {
    prismaMock.dossier.findFirst.mockResolvedValueOnce({
      reference: 'EB-202609-002',
      stage: 0,
      motifRejet: 'Pièces manquantes',
      ficheUploaded: false,
      recepisseUploaded: false,
      recepisseUrl: null,
    } as never);

    const res = await GET(makeReq('reference=EB-202609-002&whatsapp=%2B229+97+00+00+00'));
    expect((await res.json()).motifRejet).toBe('Pièces manquantes');
  });

  it('returns recepisseUrl only when stage is 5 and the récépissé was uploaded', async () => {
    prismaMock.dossier.findFirst.mockResolvedValueOnce({
      reference: 'EB-202609-003',
      stage: 5,
      motifRejet: null,
      ficheUploaded: true,
      recepisseUploaded: true,
      recepisseUrl: 'https://res.cloudinary.com/demo/raw/upload/dossiers/x/recepisse',
    } as never);

    const res = await GET(makeReq('reference=EB-202609-003&whatsapp=%2B229+97+00+00+00'));
    expect((await res.json()).recepisseUrl).toBe(
      'https://res.cloudinary.com/demo/raw/upload/dossiers/x/recepisse',
    );
  });

  it('returns generic 404 on no match, without hinting which field was wrong', async () => {
    prismaMock.dossier.findFirst.mockResolvedValueOnce(null);
    const res = await GET(makeReq('reference=EB-202609-999&whatsapp=%2B229+00+00+00+00'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'NOT_FOUND', message: 'Dossier introuvable.' });
  });

  it('returns 400 when reference or whatsapp query param is missing', async () => {
    const res = await GET(makeReq('reference=EB-202609-001'));
    expect(res.status).toBe(400);
    expect(prismaMock.dossier.findFirst).not.toHaveBeenCalled();
  });
});
