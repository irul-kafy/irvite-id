/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params, @typescript-eslint/no-unused-vars */
import test, { mock } from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function(id: string) {
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: (name: string) => name === 'auth_token' ? { value: 'mock-token' } : undefined,
        delete: () => {}
      })
    };
  }
  return origRequire.apply(this, arguments);
};

const { POST: WalkInPost } = require('./route');

test('Walk-in BFF rejects cross-origin request with 403', async () => {
  const req = new Request('http://localhost/api/events/evt-1/attendance/walk-in', {
    method: 'POST',
    headers: { origin: 'http://evil.com', 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Walk-In Guest' }),
  });
  const res = await WalkInPost(req, { params: Promise.resolve({ eventId: 'evt-1' }) });
  assert.strictEqual(res.status, 403);
});

test('Walk-in BFF forwards valid walk-in registration to internal API', async () => {
  let capturedUrl = '';
  let capturedBody = '';
  mock.method(global, 'fetch', async (url: string, opts: any) => {
    capturedUrl = url;
    capturedBody = opts.body;
    return new Response(JSON.stringify({
      result: 'CHECKED_IN',
      status: 'COMPLETE',
      scannedPax: 2,
      guest: { name: 'Bpk. Ahmad', maxPax: 2, category: 'ON_THE_SPOT' },
      attendance: { scannedPax: 2, scannedAt: new Date().toISOString() }
    }), { status: 200 });
  });

  const req = new Request('http://localhost/api/events/evt-1/attendance/walk-in', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3001',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Bpk. Ahmad',
      pax: 2,
      category: 'ON_THE_SPOT',
      tableNumber: '10',
      extraMaliciousField: 'strip-me'
    })
  });

  const res = await WalkInPost(req, { params: Promise.resolve({ eventId: 'evt-1' }) });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(capturedUrl.includes('/events/evt-1/attendance/walk-in'), true);

  const parsed = JSON.parse(capturedBody);
  assert.deepStrictEqual(parsed, {
    name: 'Bpk. Ahmad',
    pax: 2,
    category: 'ON_THE_SPOT',
    tableNumber: '10'
  });
  mock.reset();
});

