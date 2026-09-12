/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test from 'node:test';
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

const { POST: TemplatesPost } = require('./route');
const { PATCH: TemplateDetailPatch } = require('./[templateId]/route');

test('BFF Templates Origin Rejection', async (t) => {
  await t.test('POST /api/templates rejects invalid origin with 403', async () => {
    const req = new Request('http://localhost/api/templates', {
      method: 'POST',
      headers: {
        origin: 'http://evil-attacker.com',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Malicious' }),
    });
    const res = await TemplatesPost(req);
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.message, 'Forbidden');
  });

  await t.test('PATCH /api/templates/[templateId] rejects invalid origin with 403', async () => {
    const req = new Request('http://localhost/api/templates/tpl-1', {
      method: 'PATCH',
      headers: {
        origin: 'http://evil-attacker.com',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Malicious' }),
    });
    const res = await TemplateDetailPatch(req, { params: Promise.resolve({ templateId: 'tpl-1' }) });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.message, 'Forbidden');
  });
});
