/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

// Setup next/headers mock
let mockCookieValue: string | undefined = 'mock-token';
let deletedCookies: string[] = [];

const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function(id: string) {
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: (name: string) => name === 'auth_token' && mockCookieValue ? { value: mockCookieValue } : undefined,
        delete: (name: string) => { deletedCookies.push(name); }
      })
    };
  }
  return origRequire.apply(this, arguments);
};

const { POST: FilePreviewPost } = require('./[eventId]/guests/import/file/preview/route');
const { POST: SheetsPreviewPost } = require('./[eventId]/guests/import/sheets/preview/route');
const { POST: ConfirmPost } = require('./[eventId]/guests/import/confirm/route');
const { GET: TemplateGet } = require('./[eventId]/guests/import/template/route');
const { POST: ReportPost } = require('./[eventId]/guests/import/report/route');

const origFetch = global.fetch;

test('BFF Import - Mutation Origin Rejection', async (t) => {
  const checkOrigin = async (handler: any, isMultipart = false) => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'origin': 'http://evil.com',
        ...(isMultipart ? {} : { 'content-type': 'application/json' })
      },
      body: isMultipart ? new FormData() : JSON.stringify({ test: 123 })
    });
    const res = await handler(req, { params: Promise.resolve({ eventId: 'ev-1' }) });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.message, 'Forbidden');
  };

  await t.test('file/preview rejects invalid origin', async () => checkOrigin(FilePreviewPost, true));
  await t.test('sheets/preview rejects invalid origin', async () => checkOrigin(SheetsPreviewPost));
  await t.test('confirm rejects invalid origin', async () => checkOrigin(ConfirmPost));
  await t.test('report rejects invalid origin', async () => checkOrigin(ReportPost));
});

test('BFF Import - Upstream 401 Clears auth_token', async (t) => {
  await t.test('template upstream 401 clears cookie', async () => {
    mockCookieValue = 'mock-token';
    deletedCookies = [];
    global.fetch = async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }) as any;

    const req = new Request('http://localhost/api/template', { method: 'GET' });
    const res = await TemplateGet(req, { params: Promise.resolve({ eventId: 'ev-1' }) });
    assert.strictEqual(res.status, 401);
    assert.ok(res.cookies.get('auth_token') === undefined || res.headers.get('set-cookie')?.includes('auth_token=;'));
  });

  await t.test('report upstream 401 clears cookie', async () => {
    mockCookieValue = 'mock-token';
    deletedCookies = [];
    global.fetch = async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }) as any;

    const req = new Request('http://localhost/api/report', {
      method: 'POST',
      headers: {
        'origin': 'http://localhost:3001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ rows: [] })
    });
    const res = await ReportPost(req, { params: Promise.resolve({ eventId: 'ev-1' }) });
    assert.strictEqual(res.status, 401);
    assert.ok(res.headers.get('set-cookie')?.includes('auth_token=;'));
  });

  await t.test('confirm upstream 401 clears cookie', async () => {
    mockCookieValue = 'mock-token';
    deletedCookies = [];
    global.fetch = async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }) as any;

    const req = new Request('http://localhost/api/confirm', {
      method: 'POST',
      headers: {
        'origin': 'http://localhost:3001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ rows: [] })
    });
    const res = await ConfirmPost(req, { params: Promise.resolve({ eventId: 'ev-1' }) });
    assert.strictEqual(res.status, 401);
    assert.ok(res.headers.get('set-cookie')?.includes('auth_token=;'));
  });

  global.fetch = origFetch;
});

test('BFF Import - Confirm canonical URL post-commit safety', async (t) => {
  await t.test('confirm success passes through and enriches canonicalUrl', async () => {
    process.env.PUBLIC_INVITATION_URL = 'http://localhost:3002';
    global.fetch = async () => new Response(JSON.stringify({
      totalProcessed: 1,
      importedCount: 1,
      results: [{ sourceRow: 1, name: 'Budi', uniqueCode: 'test-22-char-unique-code' }]
    }), { status: 200 }) as any;

    const req = new Request('http://localhost/api/confirm', {
      method: 'POST',
      headers: {
        'origin': 'http://localhost:3001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ rows: [] })
    });
    const res = await ConfirmPost(req, { params: Promise.resolve({ eventId: 'ev-1' }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.results[0].canonicalUrl, 'http://localhost:3002/i/test-22-char-unique-code');
  });

  await t.test('canonical URL helper failure does not convert committed success to HTTP 500', async () => {
    // Break invitation url env to trigger helper error
    const oldUrl = process.env.PUBLIC_INVITATION_URL;
    const oldNext = process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    delete process.env.PUBLIC_INVITATION_URL;
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;

    global.fetch = async () => new Response(JSON.stringify({
      totalProcessed: 1,
      importedCount: 1,
      results: [{ sourceRow: 1, name: 'Budi', uniqueCode: 'test-code' }]
    }), { status: 200 }) as any;

    const req = new Request('http://localhost/api/confirm', {
      method: 'POST',
      headers: {
        'origin': 'http://localhost:3001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ rows: [] })
    });
    const res = await ConfirmPost(req, { params: Promise.resolve({ eventId: 'ev-1' }) });
    // MUST still be 200 (not 500) and canonicalUrl null
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.results[0].uniqueCode, 'test-code');
    assert.strictEqual(data.results[0].canonicalUrl, null);

    process.env.PUBLIC_INVITATION_URL = oldUrl;
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = oldNext;
  });

  global.fetch = origFetch;
});
