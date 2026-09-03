import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function makeReq(token: string): NextRequest {
  return new NextRequest(`http://test/api/dossiers/auth-form/${token}`, { method: 'GET' });
}
function paramsOf(token: string): { params: Promise<{ token: string }> } {
  return { params: Promise.resolve({ token }) };
}

describe('GET /api/dossiers/auth-form/[token]', () => {
  it('returns valid:true + reference for a live, unfilled, stage-2 token', async () => {
    prismaMock.dossier.findUnique.mockResolvedValueOnce({
      reference: 'EB-202609-001',
      stage: 2,
      authTokenExpiresAt: new Date(Date.now() + 60_000),
      authSubmittedAt: null,
    } as never);

    const res = await GET(makeReq('tok_live'), paramsOf('tok_live'));
    expect(await res.json()).toEqual({ valid: true, reference: 'EB-202609-001' });
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
    } as never);
    const res = await GET(makeReq('tok_wrongstage'), paramsOf('tok_wrongstage'));
    expect(await res.json()).toEqual({ valid: false, reason: 'wrong-stage' });
  });
});
