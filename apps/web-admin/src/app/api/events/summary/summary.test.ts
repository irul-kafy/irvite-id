/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';

let token: string | undefined;
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'next/headers') return { cookies: async () => ({ get: () => token ? { value: token } : undefined }) };
  return originalRequire.call(this, id);
};
const { GET } = require('./route');
const { GET: listEvents } = require('../route');
(Module.prototype as any).require = originalRequire;

test('summary proxy enforces session, propagates authorization, does not cache, and fails closed', async (t) => {
  t.after(() => mock.restoreAll());
  const fetchMock = mock.method(globalThis, 'fetch', async (url: unknown, options?: RequestInit) => {
    void url;
    void options;
    return Response.json({ totalEvents: 42 });
  });
  assert.equal((await GET()).status, 401);
  assert.equal(fetchMock.mock.callCount(), 0);
  token = 'fixture-token';
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { totalEvents: 42 });
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.ok(String(url).endsWith('/api/v1/events/summary'));
  assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer fixture-token');
  assert.equal(options?.cache, 'no-store');
  for (const status of [401, 403, 500]) {
    fetchMock.mock.mockImplementation(async () => new Response(null, { status }));
    assert.equal((await GET()).status, status);
  }
  fetchMock.mock.mockImplementation(async () => { throw new Error('private upstream detail'); });
  const failed = await GET();
  assert.equal(failed.status, 502);
  assert.ok(!(await failed.text()).includes('private upstream detail'));
});

test('event list forwards only pagination/filter, never an injected owner', async (t) => {
  t.after(() => mock.restoreAll());
  token = 'fixture-token';
  let upstream = '';
  mock.method(globalThis, 'fetch', async (url: unknown) => {
    upstream = String(url);
    return Response.json({ data: [], meta: { page: 2, total: 11 } });
  });
  const response = await listEvents(new Request('http://localhost/api/events?page=2&limit=10&filter=archived&userId=someone-else'));
  assert.equal(response.status, 200);
  assert.ok(upstream.endsWith('/events?page=2&limit=10&filter=archived'));
  assert.ok(!upstream.includes('userId'));
});
