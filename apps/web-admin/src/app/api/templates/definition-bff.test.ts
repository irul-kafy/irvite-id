/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test, { mock } from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

let currentToken: string | undefined = 'mock-token';

const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: (name: string) =>
          name === 'auth_token' && currentToken ? { value: currentToken } : undefined,
        delete: () => {},
      }),
    };
  }
  return origRequire.apply(this, arguments);
};

const { GET: DefinitionGet } = require('./[templateId]/definition/route');

const validTemplateId = '11111111-1111-4111-8111-111111111111';

test('BFF Template Definition Endpoint', async (t) => {
  await t.test('GET returns 401 if unauthenticated', async () => {
    currentToken = undefined;
    const req = new Request(`http://localhost/api/templates/${validTemplateId}/definition`, {
      method: 'GET',
    });
    const res = await DefinitionGet(req, {
      params: Promise.resolve({ templateId: validTemplateId }),
    });
    assert.strictEqual(res.status, 401);
    currentToken = 'mock-token';
  });

  await t.test('GET returns 400 if templateId is invalid UUID', async () => {
    const req = new Request('http://localhost/api/templates/invalid-uuid/definition', {
      method: 'GET',
    });
    const res = await DefinitionGet(req, {
      params: Promise.resolve({ templateId: 'invalid-uuid' }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.message, 'Invalid template');
  });

  await t.test('GET forwards bearer token and returns definition data', async () => {
    let capturedUrl = '';
    let capturedAuth = '';

    mock.method(global, 'fetch', async (url: string, init: any) => {
      capturedUrl = url;
      capturedAuth = init.headers.Authorization;
      return new Response(
        JSON.stringify({
          templateId: validTemplateId,
          themeCode: 'IVORY_GARDEN',
          schemaVersion: 1,
          contentFields: [{ key: 'partnerOneName', label: 'Nama Pasangan 1', type: 'text' }],
          mediaSlots: [{ key: 'hero', label: 'Foto Utama', mediaType: 'PHOTO' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const req = new Request(`http://localhost/api/templates/${validTemplateId}/definition`, {
      method: 'GET',
    });
    const res = await DefinitionGet(req, {
      params: Promise.resolve({ templateId: validTemplateId }),
    });

    assert.strictEqual(res.status, 200);
    assert.match(capturedUrl, new RegExp(`/templates/${validTemplateId}/definition$`));
    assert.strictEqual(capturedAuth, 'Bearer mock-token');

    const body = await res.json();
    assert.strictEqual(body.themeCode, 'IVORY_GARDEN');
    assert.strictEqual(body.contentFields.length, 1);
  });

  await t.test('GET clears cookie on upstream 401', async () => {
    mock.method(global, 'fetch', async () => {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    });

    const req = new Request(`http://localhost/api/templates/${validTemplateId}/definition`, {
      method: 'GET',
    });
    const res = await DefinitionGet(req, {
      params: Promise.resolve({ templateId: validTemplateId }),
    });

    assert.strictEqual(res.status, 401);
    const cookie = res.cookies.get('auth_token');
    assert.ok(cookie, 'auth_token cookie must be present in response');
    assert.strictEqual(cookie.value, '', 'auth_token value must be empty (deleted)');
  });

  await t.test('GET forwards upstream 404', async () => {
    mock.method(global, 'fetch', async () => {
      return new Response(
        JSON.stringify({ message: 'Template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const req = new Request(`http://localhost/api/templates/${validTemplateId}/definition`, {
      method: 'GET',
    });
    const res = await DefinitionGet(req, {
      params: Promise.resolve({ templateId: validTemplateId }),
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.message, 'Template not found');
  });
});
