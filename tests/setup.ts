import { setupServer } from './fixtures/mockApi';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { RequestHandler } from 'msw';

import { SignJWT } from 'jose';

const secret = new Uint8Array([1, 2, 3]); //new TextEncoder().encode("potato");
const alg = 'HS256';

export const server = setupServer();
export const respond = (...h: RequestHandler[]) => {
  server.use(...h);
  return server;
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export async function manualDummyJWT(payload: unknown) {
  const buf = Buffer.from(JSON.stringify(payload));
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + buf.toString('base64') + '.test';
}

export async function dummyJWT(payload = {}, opts: { exp: string } = { exp: '2h' }) {
  const toSign = new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setIssuer('urn:example:issuer')
    .setAudience('urn:example:audience')
    .setExpirationTime(opts.exp);

  return await toSign.sign(secret);
}
