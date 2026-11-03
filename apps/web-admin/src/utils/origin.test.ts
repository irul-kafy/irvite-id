import test from 'node:test';
import assert from 'node:assert';
import { isValidAdminOrigin } from './origin';

test('isValidAdminOrigin', async (t) => {
  const origEnv = process.env.WEB_ADMIN_ORIGIN;

  t.afterEach(() => {
    process.env.WEB_ADMIN_ORIGIN = origEnv;
  });

  await t.test('returns true when origin matches WEB_ADMIN_ORIGIN', () => {
    process.env.WEB_ADMIN_ORIGIN = 'https://admin.custom.domain';
    const req = new Request('https://admin.custom.domain/api/test', {
      headers: { origin: 'https://admin.custom.domain' },
    });
    assert.strictEqual(isValidAdminOrigin(req), true);
  });

  await t.test('returns true when origin matches same host via host header', () => {
    delete process.env.WEB_ADMIN_ORIGIN;
    const req = new Request('https://irvite-admin.vercel.app/api/test', {
      headers: {
        origin: 'https://irvite-admin.vercel.app',
        host: 'irvite-admin.vercel.app',
      },
    });
    assert.strictEqual(isValidAdminOrigin(req), true);
  });

  await t.test('returns true for irvite-admin.vercel.app even if WEB_ADMIN_ORIGIN is localhost', () => {
    process.env.WEB_ADMIN_ORIGIN = 'http://localhost:3001';
    const req = new Request('https://irvite-admin.vercel.app/api/test', {
      headers: { origin: 'https://irvite-admin.vercel.app' },
    });
    assert.strictEqual(isValidAdminOrigin(req), true);
  });

  await t.test('returns true for irvite-id-57xk.vercel.app', () => {
    const req = new Request('https://irvite-id-57xk.vercel.app/api/test', {
      headers: { origin: 'https://irvite-id-57xk.vercel.app' },
    });
    assert.strictEqual(isValidAdminOrigin(req), true);
  });

  await t.test('returns true for irvite.id and subdomains', () => {
    const req1 = new Request('https://irvite.id/api/test', {
      headers: { origin: 'https://irvite.id' },
    });
    const req2 = new Request('https://admin.irvite.id/api/test', {
      headers: { origin: 'https://admin.irvite.id' },
    });
    assert.strictEqual(isValidAdminOrigin(req1), true);
    assert.strictEqual(isValidAdminOrigin(req2), true);
  });

  await t.test('returns true for localhost loopback', () => {
    const req = new Request('http://localhost:3001/api/test', {
      headers: { origin: 'http://localhost:3001' },
    });
    assert.strictEqual(isValidAdminOrigin(req), true);
  });

  await t.test('returns false when origin is from untrusted domain', () => {
    process.env.WEB_ADMIN_ORIGIN = 'https://irvite-admin.vercel.app';
    const req = new Request('https://irvite-admin.vercel.app/api/test', {
      headers: { origin: 'https://evil-hacker.com' },
    });
    assert.strictEqual(isValidAdminOrigin(req), false);
  });

  await t.test('returns false when origin header is missing', () => {
    const req = new Request('https://irvite-admin.vercel.app/api/test');
    assert.strictEqual(isValidAdminOrigin(req), false);
  });
});
