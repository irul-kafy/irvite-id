/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
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

const { GET: TemplatesGet, POST: TemplatesPost } = require('./route');
const { GET: TemplateDetailGet, PATCH: TemplateDetailPatch } = require('./[templateId]/route');

test('BFF Templates Collection & Detail Endpoints', async (t) => {
  await t.test('GET /api/templates returns 401 if unauthenticated', async () => {
    (Module.prototype as any).require = function(id: string) {
      if (id === 'next/headers') {
        return { cookies: async () => ({ get: () => undefined, delete: () => {} }) };
      }
      return origRequire.apply(this, arguments);
    };

    delete require.cache[require.resolve('./route')];
    const { GET: UnauthGet } = require('./route');

    const req = new Request('http://localhost/api/templates', { method: 'GET' });
    const res = await UnauthGet(req);
    assert.strictEqual(res.status, 401);

    (Module.prototype as any).require = origRequire;
    delete require.cache[require.resolve('./route')];
  });

  await t.test('GET /api/templates forwards pagination query string to upstream', async () => {
    let capturedUrl = '';
    mock.method(global, 'fetch', async (url: string) => {
      capturedUrl = url;
      return new Response(JSON.stringify({ data: [], meta: { total: 0 } }), { status: 200 });
    });

    const req = new Request('http://localhost/api/templates?page=2&limit=50', { method: 'GET' });
    const res = await TemplatesGet(req);
    assert.strictEqual(res.status, 200);
    assert.ok(capturedUrl.includes('/templates?page=2&limit=50'));
    mock.reset();
  });

  await t.test('GET /api/templates forwards upstream 403', async () => {
    mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }));

    const req = new Request('http://localhost/api/templates', { method: 'GET' });
    const res = await TemplatesGet(req);
    assert.strictEqual(res.status, 403);
    mock.reset();
  });

  await t.test('POST /api/templates returns 415 on invalid Content-Type', async () => {
    const req = new Request('http://localhost/api/templates', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3001',
        'content-type': 'text/plain',
      },
      body: 'plain text',
    });
    const res = await TemplatesPost(req);
    assert.strictEqual(res.status, 415);
  });

  await t.test('POST /api/templates forwards 400 Bad Request on invalid payload', async () => {
    mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Invalid config' }), { status: 400 }));

    const req = new Request('http://localhost/api/templates', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: '' }),
    });
    const res = await TemplatesPost(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.message, 'Invalid config');
    mock.reset();
  });

  await t.test('POST /api/templates forwards 403 Forbidden for non-superadmin', async () => {
    mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Forbidden resource' }), { status: 403 }));

    const req = new Request('http://localhost/api/templates', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test' }),
    });
    const res = await TemplatesPost(req);
    assert.strictEqual(res.status, 403);
    mock.reset();
  });

  await t.test('POST /api/templates returns 201 on success', async () => {
    const created = { id: 'tpl-1', name: 'Created', themeCode: 'GENERIC' };
    mock.method(global, 'fetch', async () => new Response(JSON.stringify(created), { status: 201 }));

    const req = new Request('http://localhost/api/templates', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Created', themeCode: 'GENERIC' }),
    });
    const res = await TemplatesPost(req);
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.deepStrictEqual(data, created);
    mock.reset();
  });

  await t.test('GET /api/templates/[templateId] forwards 404 Not Found', async () => {
    mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }));

    const req = new Request('http://localhost/api/templates/non-existent', { method: 'GET' });
    const res = await TemplateDetailGet(req, { params: Promise.resolve({ templateId: 'non-existent' }) });
    assert.strictEqual(res.status, 404);
    mock.reset();
  });

  await t.test('GET /api/templates/[templateId] returns 200 on success', async () => {
    const tpl = { id: 'tpl-1', name: 'Template 1' };
    mock.method(global, 'fetch', async () => new Response(JSON.stringify(tpl), { status: 200 }));

    const req = new Request('http://localhost/api/templates/tpl-1', { method: 'GET' });
    const res = await TemplateDetailGet(req, { params: Promise.resolve({ templateId: 'tpl-1' }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.deepStrictEqual(data, tpl);
    mock.reset();
  });

  await t.test('PATCH /api/templates/[templateId] forwards 403 Forbidden', async () => {
    mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }));

    const req = new Request('http://localhost/api/templates/tpl-1', {
      method: 'PATCH',
      headers: {
        origin: 'http://localhost:3001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });
    const res = await TemplateDetailPatch(req, { params: Promise.resolve({ templateId: 'tpl-1' }) });
    assert.strictEqual(res.status, 403);
    mock.reset();
  });

  await t.test('PATCH /api/templates/[templateId] returns 200 on success', async () => {
    const updated = { id: 'tpl-1', name: 'Updated Name' };
    mock.method(global, 'fetch', async () => new Response(JSON.stringify(updated), { status: 200 }));

    const req = new Request('http://localhost/api/templates/tpl-1', {
      method: 'PATCH',
      headers: {
        origin: 'http://localhost:3001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const res = await TemplateDetailPatch(req, { params: Promise.resolve({ templateId: 'tpl-1' }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.deepStrictEqual(data, updated);
    mock.reset();
  });
});
