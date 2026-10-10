/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';

let signedIn = true;
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string, ...args: unknown[]) {
  if (id === 'next/headers') return { cookies: async () => ({ get: () => signedIn ? { value: 'test-session' } : undefined }) };
  return originalRequire.apply(this, [id, ...args]);
};
const { GET } = require('./[assetId]/route');
(Module.prototype as any).require = originalRequire;

const assetId = '11111111-1111-4111-8111-111111111111';
const request = new Request(`http://localhost:3001/api/template-assets/${assetId}`);
const context = { params: Promise.resolve({ assetId }) };

test('template asset preview proxy', async (t) => {
  await t.test('requires a session before requesting an asset', async (t) => {
    signedIn = false;
    t.after(() => { signedIn = true; });
    const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch'); });
    const response = await GET(request, context);
    assert.equal(response.status, 401);
    assert.equal(fetch.mock.callCount(), 0);
  });

  await t.test('rejects invalid asset IDs before making a request', async (t) => {
    const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch'); });
    const response = await GET(request, { params: Promise.resolve({ assetId: '../secret' }) });
    assert.equal(response.status, 400);
    assert.equal(fetch.mock.callCount(), 0);
  });

  await t.test('streams the original image with private caching and a bounded request', async (t) => {
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.ok(url.endsWith(`/templates/assets/${assetId}/file`));
      assert.equal(init.cache, 'no-store');
      assert.ok(init.signal instanceof AbortSignal);
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png', 'Content-Length': '3' } });
    });
    const response = await GET(request, context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.equal(response.headers.get('cache-control'), 'private, max-age=3600');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('content-length'), '3');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
  });

  await t.test('returns a non-cacheable 404 for a removed asset', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response('private upstream detail', { status: 404 }));
    const response = await GET(request, context);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { message: 'Asset not found' });
  });

  await t.test('maps upstream timeout to a safe retryable response', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('internal URL detail', 'TimeoutError'); });
    const response = await GET(request, context);
    assert.equal(response.status, 504);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { message: 'Asset request timed out' });
  });

  await t.test('maps a network failure to service unavailable without leaking details', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => { throw new Error('private connection detail'); });
    const response = await GET(request, context);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { message: 'Asset service unavailable' });
  });

  await t.test('rejects a successful upstream response with no asset body', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
    const response = await GET(request, context);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { message: 'Invalid asset response' });
  });
});
