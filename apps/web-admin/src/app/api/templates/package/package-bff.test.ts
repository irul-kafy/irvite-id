/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';

const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function(id: string) {
  if (id === 'next/headers') {
    return { cookies: async () => ({ get: () => ({ value: 'token' }), delete: () => {} }) };
  }
  return originalRequire.apply(this, arguments);
};

const { POST } = require('./route');

test('template package BFF', async (t) => {
  await t.test('rejects a foreign mutation origin', async () => {
    const response = await POST(new Request('http://localhost:3001/api/templates/package', {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'content-type': 'multipart/form-data; boundary=x' },
      body: '--x--',
    }));
    assert.equal(response.status, 403);
  });

  await t.test('forwards a valid multipart draft package with bearer auth', async () => {
    let capturedAuthorization = '';
    let receivedForm = false;
    mock.method(global, 'fetch', async (_url: string | URL | Request, init?: RequestInit) => {
      capturedAuthorization = new Headers(init?.headers).get('authorization') || '';
      receivedForm = init?.body instanceof FormData;
      return new Response(JSON.stringify({ id: 'template-1', status: 'HIDDEN' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const form = new FormData();
    form.append('manifest', JSON.stringify({ schemaVersion: 1 }));
    form.append('assets', '[]');
    const response = await POST(new Request('http://localhost:3001/api/templates/package', {
      method: 'POST',
      headers: { origin: 'http://localhost:3001' },
      body: form,
    }));
    assert.equal(response.status, 201);
    assert.equal(capturedAuthorization, 'Bearer token');
    assert.equal(receivedForm, true);
    mock.reset();
  });
});
