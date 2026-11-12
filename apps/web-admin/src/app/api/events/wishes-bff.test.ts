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

const { GET: WishesGet } = require('./[eventId]/wishes/route');
const { DELETE: WishDelete } = require('./[eventId]/wishes/[wishId]/route');

const validEventId = 'f2d037f1-0b6a-4c89-8b49-60efba2245f7';

test('Wishes BFF GET rejects invalid event ID with 400', async () => {
  const req = new Request('http://localhost:3001/api/events/invalid-uuid/wishes');
  const res = await WishesGet(req, { params: Promise.resolve({ eventId: 'invalid-uuid' }) });
  assert.strictEqual(res.status, 400);
});

test('Wishes BFF GET forwards query parameters and returns 200', async () => {
  mock.method(global, 'fetch', async (url: string) => {
    assert.ok(url.includes('/api/v1/events/' + validEventId + '/wishes'));
    assert.ok(url.includes('search=Budi'));
    return new Response(JSON.stringify({
      total: 1,
      items: [{ id: 'w-1', name: 'Budi', message: 'Selamat!', createdAt: '2026-11-12T10:00:00.000Z' }]
    }), { status: 200 });
  });

  const req = new Request(`http://localhost:3001/api/events/${validEventId}/wishes?search=Budi&page=1&limit=20`);
  const res = await WishesGet(req, { params: Promise.resolve({ eventId: validEventId }) });
  assert.strictEqual(res.status, 200);

  const data = await res.json();
  assert.strictEqual(data.total, 1);
  assert.strictEqual(data.items[0].name, 'Budi');
  mock.reset();
});

test('Wishes BFF DELETE rejects cross-origin request with 403', async () => {
  const req = new Request(`http://localhost:3001/api/events/${validEventId}/wishes/wish-123`, {
    method: 'DELETE',
    headers: { origin: 'http://malicious-site.com' },
  });
  const res = await WishDelete(req, { params: Promise.resolve({ eventId: validEventId, wishId: 'wish-123' }) });
  assert.strictEqual(res.status, 403);
});

test('Wishes BFF DELETE forwards delete to upstream and returns 200', async () => {
  mock.method(global, 'fetch', async (url: string, init: any) => {
    assert.strictEqual(init.method, 'DELETE');
    assert.ok(url.includes('/api/v1/events/' + validEventId + '/wishes/wish-123'));
    return new Response(JSON.stringify({ success: true, message: 'Ucapan berhasil dihapus' }), { status: 200 });
  });

  const req = new Request(`http://localhost:3001/api/events/${validEventId}/wishes/wish-123`, {
    method: 'DELETE',
    headers: { origin: 'http://localhost:3001' },
  });
  const res = await WishDelete(req, { params: Promise.resolve({ eventId: validEventId, wishId: 'wish-123' }) });
  assert.strictEqual(res.status, 200);

  const data = await res.json();
  assert.strictEqual(data.success, true);
  mock.reset();
});

(Module.prototype as any).require = origRequire;

