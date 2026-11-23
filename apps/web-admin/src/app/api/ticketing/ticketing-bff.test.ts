/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test, { mock } from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';
import { NextRequest } from 'next/server';

let activeCookieToken: string | undefined = 'mock-admin-token';

const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: (name: string) =>
          name === 'auth_token' && activeCookieToken
            ? { value: activeCookieToken }
            : undefined,
        delete: () => {},
      }),
    };
  }
  return origRequire.apply(this, arguments);
};

const { GET: TicketingGet, POST: TicketingPost } = require('./route');

test('Admin /api/ticketing rejects GET and POST with 401 when session cookie is missing', async () => {
  activeCookieToken = undefined;

  const getReq = new NextRequest('http://localhost:3001/api/ticketing?mode=events');
  const getRes = await TicketingGet(getReq);
  assert.strictEqual(getRes.status, 401);

  const postReq = new NextRequest('http://localhost:3001/api/ticketing', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3001',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ action: 'check-in', qrToken: 'v1.tkt-1.sig' }),
  });
  const postRes = await TicketingPost(postReq);
  assert.strictEqual(postRes.status, 401);

  activeCookieToken = 'mock-admin-token';
});

test('Admin /api/ticketing forwards Bearer token and returns 502 on upstream failure without local fallback', async () => {
  activeCookieToken = 'mock-admin-token';
  let capturedAuth = '';
  mock.method(global, 'fetch', async (_url: string, opts: any) => {
    capturedAuth = opts?.headers?.Authorization || '';
    throw new Error('ECONNREFUSED');
  });

  const getReq = new NextRequest('http://localhost:3001/api/ticketing?mode=summary');
  const getRes = await TicketingGet(getReq);
  assert.strictEqual(capturedAuth, 'Bearer mock-admin-token');
  assert.strictEqual(getRes.status, 502);
  const data = await getRes.json();
  assert.ok(String(data.message).includes('502'));

  mock.reset();
});
