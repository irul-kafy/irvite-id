/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';

const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string, ...args: any[]) {
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: (name: string) =>
          name === 'auth_token' ? { value: 'mock-token' } : undefined,
        delete: () => {},
      }),
    };
  }
  return origRequire.apply(this, [id, ...args]);
};

const { GET: mediaListGet, POST: mediaUploadPost } = require('./[eventId]/media/route');
const { GET: mediaFileGet } = require('./[eventId]/media/[mediaId]/file/route');
const { PATCH: mediaPatch, DELETE: mediaDelete } = require('./[eventId]/media/[mediaId]/route');

(Module.prototype as any).require = origRequire;

const eventId = '11111111-1111-4111-8111-111111111111';
const mediaId = '22222222-2222-4222-8222-222222222222';
const context = { params: Promise.resolve({ eventId, mediaId }) };
const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';

test('Media BFF routes', async (t) => {
  const previousBase = process.env.INTERNAL_API_URL;
  process.env.INTERNAL_API_URL = 'http://api.internal:3000';
  t.after(() => {
    if (previousBase === undefined) delete process.env.INTERNAL_API_URL;
    else process.env.INTERNAL_API_URL = previousBase;
  });

  await t.test('GET collection forwards query and token', async () => {
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.equal(url, `http://api.internal:3000/events/${eventId}/media?page=1&limit=10`);
      assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer mock-token');
      assert.equal(init.cache, 'no-store');
      return Response.json({ data: [{ id: mediaId, slot: 'hero' }] }, { status: 200 });
    });

    const req = new Request(`http://localhost/api/events/${eventId}/media?page=1&limit=10`);
    const res = await mediaListGet(req, context);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data[0].slot, 'hero');
  });

  await t.test('POST upload validates origin and forwards multipart body', async () => {
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.equal(url, `http://api.internal:3000/events/${eventId}/media`);
      assert.equal(init.method, 'POST');
      assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer mock-token');
      const body = init.body as FormData;
      assert.equal(body.get('type'), 'PHOTO');
      assert.equal(body.get('slot'), 'hero');
      return Response.json({ id: mediaId, slot: 'hero' }, { status: 201 });
    });

    const formData = new FormData();
    formData.set('file', new File(['dummy-bytes'], 'photo.jpg', { type: 'image/jpeg' }));
    formData.set('type', 'PHOTO');
    formData.set('slot', 'hero');

    const req = new Request(`http://localhost/api/events/${eventId}/media`, {
      method: 'POST',
      headers: { origin: expectedOrigin },
      body: formData,
    });

    const res = await mediaUploadPost(req, context);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.slot, 'hero');
  });

  await t.test('POST upload rejects forbidden Origin with 403', async () => {
    const req = new Request(`http://localhost/api/events/${eventId}/media`, {
      method: 'POST',
      headers: { origin: 'http://malicious-origin.com' },
      body: new FormData(),
    });

    const res = await mediaUploadPost(req, context);
    assert.equal(res.status, 403);
  });

  await t.test('GET file streams private image with security headers', async () => {
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.equal(url, `http://api.internal:3000/events/${eventId}/media/${mediaId}/file`);
      assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer mock-token');
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      });
    });

    const req = new Request(`http://localhost/api/events/${eventId}/media/${mediaId}/file`);
    const res = await mediaFileGet(req, context);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'image/jpeg');
    assert.equal(res.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
  });

  await t.test('PATCH updates media slot / order with origin validation', async () => {
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.equal(url, `http://api.internal:3000/events/${eventId}/media/${mediaId}`);
      assert.equal(init.method, 'PATCH');
      assert.equal(init.body, JSON.stringify({ order: 1, slot: 'gallery' }));
      return Response.json({ id: mediaId, order: 1, slot: 'gallery' }, { status: 200 });
    });

    const req = new Request(`http://localhost/api/events/${eventId}/media/${mediaId}`, {
      method: 'PATCH',
      headers: {
        origin: expectedOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order: 1, slot: 'gallery' }),
    });

    const res = await mediaPatch(req, context);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.order, 1);
  });

  await t.test('DELETE removes media with origin validation', async () => {
    t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.equal(url, `http://api.internal:3000/events/${eventId}/media/${mediaId}`);
      assert.equal(init.method, 'DELETE');
      return new Response(null, { status: 204 });
    });

    const req = new Request(`http://localhost/api/events/${eventId}/media/${mediaId}`, {
      method: 'DELETE',
      headers: { origin: expectedOrigin },
    });

    const res = await mediaDelete(req, context);
    assert.equal(res.status, 204);
  });

  await t.test('Upstream 401 response clears auth cookie', async () => {
    t.mock.method(globalThis, 'fetch', async () => {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    });

    const req = new Request(`http://localhost/api/events/${eventId}/media`);
    const res = await mediaListGet(req, context);
    assert.equal(res.status, 401);
  });
});
