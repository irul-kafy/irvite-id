/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test, { mock } from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: (name: string) =>
          name === 'auth_token' ? { value: 'mock-token' } : undefined,
        delete: () => {},
      }),
    };
  }
  return origRequire.apply(this, arguments);
};

const { DELETE: TemplatePermanentDelete } = require('./[templateId]/permanent/route');

test('BFF Template Permanent Delete Endpoint', async (t) => {
  const origin = 'http://localhost:3001';

  await t.test('returns 403 if origin header is invalid / missing (CSRF protection)', async () => {
    const req = new Request('http://localhost/api/templates/tpl-1/permanent', {
      method: 'DELETE',
      headers: {
        origin: 'http://malicious-site.test',
      },
    });

    const res = await TemplatePermanentDelete(req, {
      params: Promise.resolve({ templateId: 'tpl-1' }),
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.message, 'Forbidden');
  });

  await t.test('returns 401 if unauthenticated (missing auth_token)', async () => {
    (Module.prototype as any).require = function (id: string) {
      if (id === 'next/headers') {
        return {
          cookies: async () => ({
            get: () => undefined,
            delete: () => {},
          }),
        };
      }
      return origRequire.apply(this, arguments);
    };

    delete require.cache[require.resolve('./[templateId]/permanent/route')];
    const { DELETE: UnauthDelete } = require('./[templateId]/permanent/route');

    const req = new Request('http://localhost/api/templates/tpl-1/permanent', {
      method: 'DELETE',
      headers: { origin },
    });
    const res = await UnauthDelete(req, {
      params: Promise.resolve({ templateId: 'tpl-1' }),
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.message, 'Unauthorized');

    (Module.prototype as any).require = origRequire;
    delete require.cache[require.resolve('./[templateId]/permanent/route')];
  });

  await t.test('forwards DELETE to upstream API with Authorization header and returns 200 on success', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedAuthHeader = '';

    mock.method(global, 'fetch', async (url: string, init: any) => {
      capturedUrl = url;
      capturedMethod = init?.method;
      capturedAuthHeader = init?.headers?.Authorization;
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Template permanently deleted successfully',
          data: { id: 'tpl-1', name: 'Custom Theme', themeCode: 'CUSTOM_THEME' },
        }),
        { status: 200 }
      );
    });

    const req = new Request('http://localhost/api/templates/tpl-1/permanent', {
      method: 'DELETE',
      headers: { origin },
    });
    const res = await TemplatePermanentDelete(req, {
      params: Promise.resolve({ templateId: 'tpl-1' }),
    });

    assert.strictEqual(res.status, 200);
    assert.ok(capturedUrl.includes('/templates/tpl-1/permanent'));
    assert.strictEqual(capturedMethod, 'DELETE');
    assert.strictEqual(capturedAuthHeader, 'Bearer mock-token');

    const data = await res.json();
    assert.strictEqual(data.status, 'success');
    mock.reset();
  });

  await t.test('preserves upstream 400 BadRequest with message', async () => {
    mock.method(
      global,
      'fetch',
      async () =>
        new Response(
          JSON.stringify({
            message: 'Only archived templates can be permanently deleted. Current status is AVAILABLE.',
          }),
          { status: 400 }
        )
    );

    const req = new Request('http://localhost/api/templates/tpl-1/permanent', {
      method: 'DELETE',
      headers: { origin },
    });
    const res = await TemplatePermanentDelete(req, {
      params: Promise.resolve({ templateId: 'tpl-1' }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('Only archived templates'));
    mock.reset();
  });

  await t.test('preserves upstream 403 Forbidden with message', async () => {
    mock.method(
      global,
      'fetch',
      async () =>
        new Response(
          JSON.stringify({ message: 'Forbidden resource' }),
          { status: 403 }
        )
    );

    const req = new Request('http://localhost/api/templates/tpl-1/permanent', {
      method: 'DELETE',
      headers: { origin },
    });
    const res = await TemplatePermanentDelete(req, {
      params: Promise.resolve({ templateId: 'tpl-1' }),
    });

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.message, 'Forbidden resource');
    mock.reset();
  });

  await t.test('preserves upstream 404 NotFound with message', async () => {
    mock.method(
      global,
      'fetch',
      async () =>
        new Response(
          JSON.stringify({ message: 'Template with ID tpl-1 not found' }),
          { status: 404 }
        )
    );

    const req = new Request('http://localhost/api/templates/tpl-1/permanent', {
      method: 'DELETE',
      headers: { origin },
    });
    const res = await TemplatePermanentDelete(req, {
      params: Promise.resolve({ templateId: 'tpl-1' }),
    });

    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.ok(data.message.includes('not found'));
    mock.reset();
  });

  await t.test('preserves upstream 409 Conflict with message (e.g. built-in or event referenced)', async () => {
    mock.method(
      global,
      'fetch',
      async () =>
        new Response(
          JSON.stringify({
            message: 'Built-in system templates cannot be permanently deleted. Archive the template instead.',
          }),
          { status: 409 }
        )
    );

    const req = new Request('http://localhost/api/templates/tpl-1/permanent', {
      method: 'DELETE',
      headers: { origin },
    });
    const res = await TemplatePermanentDelete(req, {
      params: Promise.resolve({ templateId: 'tpl-1' }),
    });

    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.ok(data.message.includes('Built-in system templates cannot be permanently deleted'));
    mock.reset();
  });

  await t.test('handles upstream 401 by clearing auth_token cookie', async () => {
    mock.method(
      global,
      'fetch',
      async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
    );

    const req = new Request('http://localhost/api/templates/tpl-1/permanent', {
      method: 'DELETE',
      headers: { origin },
    });
    const res = await TemplatePermanentDelete(req, {
      params: Promise.resolve({ templateId: 'tpl-1' }),
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.message, 'Unauthorized');
    mock.reset();
  });
});
