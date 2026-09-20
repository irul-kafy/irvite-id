import test from 'node:test';
import assert from 'node:assert';
import { middleware, config } from './middleware';
import { NextRequest } from 'next/server';

function createMockRequest(pathname: string, token?: string): NextRequest {
  const url = new URL(`http://localhost:3001${pathname}`);
  const headers = new Headers();
  if (token) {
    headers.set('cookie', `auth_token=${token}`);
  }
  return new NextRequest(url, { headers });
}

test('Edge Middleware Protection', async (t) => {
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
