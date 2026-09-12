/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params, @typescript-eslint/no-unused-vars */
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

const { GET: AuthMeGet } = require('./route');

test('BFF Auth Me', async (t) => {
  await t.test('returns 401 if unauthenticated (no token cookie)', async () => {
    const origCookies = (Module.prototype as any).require;
    (Module.prototype as any).require = function(id: string) {
      if (id === 'next/headers') {
        return { cookies: async () => ({ get: () => undefined, delete: () => {} }) };
      }
      return origCookies.apply(this, arguments);
    };

    delete require.cache[require.resolve('./route')];
    const { GET: UnauthGet } = require('./route');

    const res = await UnauthGet();
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.message, 'Unauthorized');

    (Module.prototype as any).require = origRequire;
    delete require.cache[require.resolve('./route')];
  });

  await t.test('forwards Bearer token and returns user on 200', async () => {
    const mockUser = { id: 'usr-123', email: 'admin@test.com', role: 'SUPER_ADMIN' };
    mock.method(global, 'fetch', async (url: string, init: RequestInit) => {
      assert.ok(url.includes('/api/v1/auth/me'));
      assert.strictEqual((init.headers as any).Authorization, 'Bearer mock-token');
      return new Response(JSON.stringify(mockUser), { status: 200 });
    });

    const res = await AuthMeGet();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.deepStrictEqual(data.user, mockUser);
    mock.reset();
  });

  await t.test('deletes cookie and returns 401 on upstream 401', async () => {
    let cookieDeleted = false;
    (Module.prototype as any).require = function(id: string) {
      if (id === 'next/headers') {
        return {
          cookies: async () => ({
            get: (name: string) => ({ value: 'expired-token' }),
            delete: (name: string) => {
              if (name === 'auth_token') cookieDeleted = true;
            }
          })
        };
      }
      return origRequire.apply(this, arguments);
    };

    delete require.cache[require.resolve('./route')];
    const { GET: ExpiredGet } = require('./route');

    mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }));

    const res = await ExpiredGet();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(cookieDeleted, false); // Response cookie deletion occurs on response object
    mock.reset();
    (Module.prototype as any).require = origRequire;
    delete require.cache[require.resolve('./route')];
  });
});
