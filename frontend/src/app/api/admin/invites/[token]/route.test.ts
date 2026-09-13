import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function paramsOf(token: string): { params: Promise<{ token: string }> } {
  return { params: Promise.resolve({ token }) };
}
function makeReq(token: string): NextRequest {
  return new NextRequest(`http://test/api/admin/invites/${token}`);
}

beforeEach(() => {
  vi.useRealTimers();
});

describe('GET /api/admin/invites/[token]', () => {
  it('returns 404 INVITE_INVALID when the token does not exist', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeReq('bad'), paramsOf('bad'));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('INVITE_INVALID');
  });

  it('returns 404 INVITE_INVALID when the invite was revoked', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValueOnce({
      email: 'agent@educbenin.info',
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      revokedAt: new Date(),
    } as never);
    const res = await GET(makeReq('tok'), paramsOf('tok'));
    expect(res.status).toBe(404);
  });

  it('returns 409 INVITE_ALREADY_CONSUMED when already consumed', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValueOnce({
      email: 'agent@educbenin.info',
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date(),
      revokedAt: null,
    } as never);
    const res = await GET(makeReq('tok'), paramsOf('tok'));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('INVITE_ALREADY_CONSUMED');
  });

  it('returns 410 INVITE_EXPIRED when past expiresAt', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValueOnce({
      email: 'agent@educbenin.info',
      expiresAt: new Date(Date.now() - 1000),
      consumedAt: null,
      revokedAt: null,
    } as never);
    const res = await GET(makeReq('tok'), paramsOf('tok'));
    expect(res.status).toBe(410);
    expect((await res.json()).error).toBe('INVITE_EXPIRED');
  });

  it('returns valid:true with isGmail:true for a gmail.com address', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValueOnce({
      email: 'agent@gmail.com',
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      revokedAt: null,
    } as never);
    const res = await GET(makeReq('tok'), paramsOf('tok'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, email: 'agent@gmail.com', isGmail: true });
  });

  it('returns valid:true with isGmail:false for a non-gmail address', async () => {
    prismaMock.adminInvite.findUnique.mockResolvedValueOnce({
      email: 'agent@educbenin.info',
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      revokedAt: null,
    } as never);
    const res = await GET(makeReq('tok'), paramsOf('tok'));
    expect(await res.json()).toEqual({
      valid: true,
      email: 'agent@educbenin.info',
      isGmail: false,
    });
  });
});
