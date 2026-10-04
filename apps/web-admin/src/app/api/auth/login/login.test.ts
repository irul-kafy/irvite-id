import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from './route';

test('login sets an HttpOnly cookie with actual token lifetime; rejects invalid expiry', async (t) => {
  const origin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';
  const request = () => new Request(origin + '/api/auth/login', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'test-only' }),
  });
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url');
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({
    accessToken: `header.${payload}.signature`, user: { role: 'ADMIN' },
  }));
  t.after(() => mock.restoreAll());
  const response = await POST(request());
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie') || '';
  assert.match(cookie, /HttpOnly/i);
  const maxAge = Number(cookie.match(/Max-Age=(\d+)/i)?.[1]);
  assert.ok(maxAge > 0 && maxAge <= 900);
  assert.equal('accessToken' in await response.json(), false);
  fetchMock.mock.mockImplementation(async () => Response.json({ accessToken: 'bad' }));
  assert.equal((await POST(request())).status, 502);
});
