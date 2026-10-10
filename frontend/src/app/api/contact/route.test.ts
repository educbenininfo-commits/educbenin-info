import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://test/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/contact', () => {
  it('stores a new message with statut "nouveau"', async () => {
    prismaMock.contactMessage.create.mockResolvedValueOnce({ id: 'm1' } as never);

    const res = await POST(
      makeReq({ nom: 'Awa', email: 'awa@example.com', message: 'Bonjour, une question.' }),
    );

    expect(res.status).toBe(201);
    expect(prismaMock.contactMessage.create).toHaveBeenCalledWith({
      data: {
        nom: 'Awa',
        email: 'awa@example.com',
        telephone: null,
        sujet: null,
        message: 'Bonjour, une question.',
        statut: 'nouveau',
      },
    });
  });

  it('accepts a WhatsApp number instead of an e-mail', async () => {
    prismaMock.contactMessage.create.mockResolvedValueOnce({ id: 'm2' } as never);

    const res = await POST(makeReq({ nom: 'Koffi', telephone: '+22997000000', message: 'Salut' }));

    expect(res.status).toBe(201);
  });

  it('rejects a message with neither e-mail nor phone', async () => {
    const res = await POST(makeReq({ nom: 'Anonyme', message: 'Sans contact' }));

    expect(res.status).toBe(400);
    expect(prismaMock.contactMessage.create).not.toHaveBeenCalled();
  });

  it('rejects an empty message', async () => {
    const res = await POST(makeReq({ nom: 'Awa', email: 'awa@example.com', message: '  ' }));

    expect(res.status).toBe(400);
  });
});
