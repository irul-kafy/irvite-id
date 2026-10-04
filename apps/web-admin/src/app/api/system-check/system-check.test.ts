/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';

let token: string | undefined;
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'next/headers') return { cookies: async () => ({
    get: () => token ? { value: token } : undefined,
  }) };
  return originalRequire.call(this, id);
};
const { GET } = require('./route');
(Module.prototype as any).require = originalRequire;

test('system checks require a verified admin and inspect database response body', async (t) => {
  t.after(() => mock.restoreAll());
  token = undefined;
  assert.equal((await GET()).status, 401);
  token = 'test-token';
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ role: 'STAFF' }));
  assert.equal((await GET()).status, 403);
  assert.equal(fetchMock.mock.callCount(), 1);
  fetchMock.mock.mockImplementation(async (url: string | URL | Request) => {
    const endpoint = String(url);
    if (endpoint.endsWith('/auth/me')) return Response.json({ role: 'ADMIN' });
    if (endpoint.endsWith('/health/db')) return Response.json({ status: 'error' });
    return new Response('API is running');
  });
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { checks } = await response.json();
  assert.equal(checks.find((c: { label: string }) => c.label === 'Database').ok, false);
  assert.equal(checks.find((c: { label: string }) => c.label === 'API').ok, true);
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 401 }));
  assert.equal((await GET()).status, 401);
});
