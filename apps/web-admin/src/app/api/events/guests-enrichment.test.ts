/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test, { mock } from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

// Set PUBLIC_INVITATION_URL for canonical URL generation
const originalPublicUrl = process.env.PUBLIC_INVITATION_URL;
process.env.PUBLIC_INVITATION_URL = 'http://localhost:3002';

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

const { GET: GuestsListGet } = require('./[eventId]/guests/route');

test('BFF Guest enrichment: guest with invitation receives canonicalUrl', async () => {
  const guestWithInv = {
    id: 'g1',
    name: 'Test Guest',
    invitation: {
      uniqueCode: 'abc123def',
      status: 'PENDING',
      rsvpPax: null,
      attendances: []
    }
  };
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({
    data: [guestWithInv],
    meta: { total: 1, page: 1, limit: 10, lastPage: 1 }
  }), { status: 200 }));

  const req = new Request('http://localhost/api/events/ev1/guests?page=1&limit=10', { method: 'GET' });
  const res = await GuestsListGet(req, { params: Promise.resolve({ eventId: 'ev1' }) });
  assert.strictEqual(res.status, 200);

  const body = await res.json();
  assert.ok(body.data);
  assert.strictEqual(body.data.length, 1);
  assert.strictEqual(body.data[0].invitation.canonicalUrl, 'http://localhost:3002/i/abc123def');
  mock.reset();
});

test('BFF Guest enrichment: guest without invitation does not receive canonicalUrl', async () => {
  const guestWithout = {
    id: 'g2',
    name: 'No Invitation Guest',
    invitation: null
  };
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({
    data: [guestWithout],
    meta: { total: 1, page: 1, limit: 10, lastPage: 1 }
  }), { status: 200 }));

  const req = new Request('http://localhost/api/events/ev1/guests?page=1&limit=10', { method: 'GET' });
  const res = await GuestsListGet(req, { params: Promise.resolve({ eventId: 'ev1' }) });
  const body = await res.json();
  assert.strictEqual(body.data[0].invitation, null);
  mock.reset();
});

test('BFF Guest enrichment: correct /i/<uniqueCode> URL pattern', async () => {
  const guest = {
    id: 'g3',
    name: 'URL Pattern Guest',
    invitation: { uniqueCode: 'xyz_789-test', status: 'RSVP_YES', rsvpPax: 2, attendances: [] }
  };
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({
    data: [guest],
    meta: { total: 1, page: 1, limit: 10, lastPage: 1 }
  }), { status: 200 }));

  const req = new Request('http://localhost/api/events/ev1/guests', { method: 'GET' });
  const res = await GuestsListGet(req, { params: Promise.resolve({ eventId: 'ev1' }) });
  const body = await res.json();
  assert.ok(body.data[0].invitation.canonicalUrl.endsWith('/i/xyz_789-test'));
  assert.ok(body.data[0].invitation.canonicalUrl.startsWith('http://localhost:3002'));
  mock.reset();
});

test('BFF Guest enrichment: pagination metadata remains unchanged', async () => {
  const meta = { total: 42, page: 3, limit: 10, lastPage: 5 };
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({
    data: [{ id: 'g4', name: 'Test', invitation: null }],
    meta
  }), { status: 200 }));

  const req = new Request('http://localhost/api/events/ev1/guests?page=3&limit=10', { method: 'GET' });
  const res = await GuestsListGet(req, { params: Promise.resolve({ eventId: 'ev1' }) });
  const body = await res.json();
  assert.deepStrictEqual(body.meta, meta);
  mock.reset();
});

test('BFF Guest enrichment: upstream 401 clears cookie and returns 401', async () => {
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }));

  const req = new Request('http://localhost/api/events/ev1/guests', { method: 'GET' });
  const res = await GuestsListGet(req, { params: Promise.resolve({ eventId: 'ev1' }) });
  assert.strictEqual(res.status, 401);
  mock.reset();
});

test('BFF Guest enrichment: preserves existing invitation fields alongside canonicalUrl', async () => {
  const guest = {
    id: 'g5',
    name: 'Full Guest',
    invitation: {
      uniqueCode: 'full_test_code',
      status: 'RSVP_YES',
      rsvpPax: 3,
      attendances: [{ scannedAt: '2026-01-01', status: 'VALID', scannedPax: 3 }]
    }
  };
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({
    data: [guest],
    meta: { total: 1, page: 1, limit: 10, lastPage: 1 }
  }), { status: 200 }));

  const req = new Request('http://localhost/api/events/ev1/guests', { method: 'GET' });
  const res = await GuestsListGet(req, { params: Promise.resolve({ eventId: 'ev1' }) });
  const body = await res.json();
  const inv = body.data[0].invitation;
  assert.strictEqual(inv.uniqueCode, 'full_test_code');
  assert.strictEqual(inv.status, 'RSVP_YES');
  assert.strictEqual(inv.rsvpPax, 3);
  assert.strictEqual(inv.attendances.length, 1);
  assert.ok(inv.canonicalUrl);
  mock.reset();
});

// Cleanup
test.after(() => {
  if (originalPublicUrl !== undefined) {
    process.env.PUBLIC_INVITATION_URL = originalPublicUrl;
  } else {
    delete process.env.PUBLIC_INVITATION_URL;
  }
  (Module.prototype as any).require = origRequire;
});
