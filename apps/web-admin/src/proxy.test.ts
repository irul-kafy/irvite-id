import test from 'node:test';
import assert from 'node:assert';
import { proxy as middleware, config } from './proxy';
import { NextRequest } from 'next/server';

function createMockRequest(pathname: string, token?: string): NextRequest {
  const url = new URL(`http://localhost:3001${pathname}`);
  const headers = new Headers();
  if (token) {
    const value = token === 'valid_token'
      ? `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.signature`
      : token;
    headers.set('cookie', `auth_token=${value}`);
  }
  return new NextRequest(url, { headers });
}

test('Proxy navigation protection (API still verifies signatures)', async (t) => {
  await t.test('expired or malformed cookies do not trap a user on login', () => {
    assert.strictEqual(middleware(createMockRequest('/login', 'expired')).status, 200);
    const result = middleware(createMockRequest('/dashboard', 'expired'));
    assert.strictEqual(result.status, 307);
    assert.match(result.headers.get('set-cookie') || '', /auth_token=;/);
  });
  await t.test('config matcher includes /staff/:path* and other protected routes', () => {
    assert.ok(config.matcher.includes('/staff/:path*'));
    assert.ok(config.matcher.includes('/dashboard/:path*'));
    assert.ok(config.matcher.includes('/events/:path*'));
    assert.ok(config.matcher.includes('/templates/:path*'));
    assert.ok(config.matcher.includes('/login'));
  });

  await t.test('anonymous user requesting /staff is redirected to /login', () => {
    const req = createMockRequest('/staff');
    const res = middleware(req);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.headers.get('location'), 'http://localhost:3001/login');
  });

  await t.test('anonymous user requesting /staff/events/123 is redirected to /login', () => {
    const req = createMockRequest('/staff/events/123');
    const res = middleware(req);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.headers.get('location'), 'http://localhost:3001/login');
  });

  await t.test('authenticated user accessing /staff proceeds', () => {
    const req = createMockRequest('/staff', 'valid_token');
    const res = middleware(req);
    // NextResponse.next() produces no redirect location and status 200
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('location'), null);
  });

  await t.test('anonymous user requesting /dashboard is redirected to /login', () => {
    const req = createMockRequest('/dashboard');
    const res = middleware(req);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.headers.get('location'), 'http://localhost:3001/login');
  });

  await t.test('anonymous user requesting /events is redirected to /login', () => {
    const req = createMockRequest('/events');
    const res = middleware(req);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.headers.get('location'), 'http://localhost:3001/login');
  });

  await t.test('anonymous user requesting /templates is redirected to /login', () => {
    const req = createMockRequest('/templates');
    const res = middleware(req);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.headers.get('location'), 'http://localhost:3001/login');
  });

  await t.test('authenticated user accessing /login is redirected to /dashboard', () => {
    const req = createMockRequest('/login', 'valid_token');
    const res = middleware(req);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.headers.get('location'), 'http://localhost:3001/dashboard');
  });
});
