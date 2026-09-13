/* eslint-disable @typescript-eslint/no-require-imports */
import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'next/headers') return { cookies: async () => ({ get: () => ({ value: 'test-session' }) }) };
  return originalRequire.call(this, id);
};
const { GET, POST } = require('./[eventId]/media/route');
const { GET: imageGet } = require('./[eventId]/media/[mediaId]/file/route');
Module.prototype.require = originalRequire;
const eventId = '11111111-1111-4111-8111-111111111111';
const mediaId = '22222222-2222-4222-8222-222222222222';
const context = { params: Promise.resolve({ eventId, mediaId }) };

test('media BFF routes retain versioned API base, session auth, and response handling', async (t) => {
  const previousBase = process.env.INTERNAL_API_URL;
  process.env.INTERNAL_API_URL = 'http://api.internal:3000/api/v1';
  t.after(() => { if (previousBase === undefined) delete process.env.INTERNAL_API_URL; else process.env.INTERNAL_API_URL = previousBase; });
  await t.test('list forwards pagination and session to exactly one API prefix', async (t) => {
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.equal(url, `http://api.internal:3000/api/v1/events/${eventId}/media?page=2&limit=100`);
      assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer test-session');
      assert.equal(init.cache, 'no-store');
      return Response.json({ data: [{ id: mediaId }], meta: { page: 2 } });
    });
    const result = await GET(new Request(`http://localhost/api/events/${eventId}/media?page=2&limit=100`), context);
    assert.equal(result.status, 200);
    assert.deepEqual((await result.json()).data, [{ id: mediaId }]);
  });
  await t.test('upload forwards multipart image and correct versioned endpoint', async (t) => {
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.equal(url, `http://api.internal:3000/api/v1/events/${eventId}/media`);
      assert.equal(init.method, 'POST');
      assert.equal((init.body as FormData).get('type'), 'PHOTO');
      assert.equal(((init.body as FormData).get('file') as File).name, 'qr.png');
      return Response.json({ id: mediaId }, { status: 201 });
    });
    const body = new FormData(); body.set('file', new File(['png'], 'qr.png', { type: 'image/png' }));
    const request = new Request('http://localhost/api/media', { method: 'POST', headers: { origin: process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001' }, body });
    assert.equal((await POST(request, context)).status, 201);
  });
  await t.test('file delivery proxies image bytes privately without rewriting API base', async (t) => {
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.equal(url, `http://api.internal:3000/api/v1/events/${eventId}/media/${mediaId}/file`);
      assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer test-session');
      return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } });
    });
    const result = await imageGet(new Request('http://localhost/api/media/file'), context);
    assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
    assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], [137, 80, 78, 71]);
  });
});
