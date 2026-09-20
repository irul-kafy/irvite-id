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

const { GET: EventGet, POST: EventPost } = require('./route');
const { PATCH: EventPatch, DELETE: EventDelete } = require('./[eventId]/route');
const { DELETE: GuestDelete } = require('./[eventId]/guests/[guestId]/route');
const { POST: BulkInvitationsPost } = require('./[eventId]/invitations/bulk/route');
const { GET: GuestGet } = require('./[eventId]/guests/[guestId]/route');
const { POST: InvitationPost } = require('./[eventId]/guests/[guestId]/invitation/route');
const { GET: GuestsListGet, POST: GuestCreatePost } = require('./[eventId]/guests/route');

test('BFF GET returns 401 if unauthenticated', async (t) => {
  const origCookies = (Module.prototype as any).require;
  (Module.prototype as any).require = function(id: string) {
    if (id === 'next/headers') {
      return { cookies: async () => ({ get: () => undefined, delete: () => {} }) };
    }
    return origCookies.apply(this, arguments);
  };
  
  delete require.cache[require.resolve('./route')];
  const { GET: EventGetUnauth } = require('./route');
  
  const req = new Request('http://localhost/api/events', { method: 'GET' });
  const res = await EventGetUnauth(req, { params: Promise.resolve({}) });
  assert.strictEqual(res.status, 401);
  (Module.prototype as any).require = origRequire;
});

test('BFF forwards 400 Bad Request on POST /api/events', async (t) => {
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Bad Request' }), { status: 400 }));
  const req = new Request('http://localhost/api/events', {
    method: 'POST',
    headers: { 'origin': 'http://localhost:3001', 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Test' })
  });
  const res = await EventPost(req, { params: Promise.resolve({}) });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.message, 'Bad Request');
  mock.reset();
});

test('BFF forwards 403 Forbidden on PATCH /api/events/[eventId]', async (t) => {
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }));
  const req = new Request('http://localhost/api/events/1', {
    method: 'PATCH',
    headers: { 'origin': 'http://localhost:3001', 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'PUBLISHED' })
  });
  const res = await EventPatch(req, { params: Promise.resolve({ eventId: '1' }) });
  assert.strictEqual(res.status, 403);
  const data = await res.json();
  assert.strictEqual(data.message, 'Forbidden');
  mock.reset();
});

test('BFF forwards 404 Not Found on GET /api/events/[eventId]/guests/[guestId]', async (t) => {
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }));
  const req = new Request('http://localhost/api/events/1/guests/2', { method: 'GET' });
  const res = await GuestGet(req, { params: Promise.resolve({ eventId: '1', guestId: '2' }) });
  assert.strictEqual(res.status, 404);
  const data = await res.json();
  assert.strictEqual(data.message, 'Not Found');
  mock.reset();
});

test('BFF forwards 409 Conflict on POST /api/events/[eventId]/guests/[guestId]/invitation', async (t) => {
  mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'Duplicate invitation' }), { status: 409 }));
  const req = new Request('http://localhost/api/events/1/guests/2/invitation', {
    method: 'POST',
    headers: { 'origin': 'http://localhost:3001', 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
  const res = await InvitationPost(req, { params: Promise.resolve({ eventId: '1', guestId: '2' }) });
  assert.strictEqual(res.status, 409);
  const data = await res.json();
  assert.strictEqual(data.message, 'Duplicate invitation');
  mock.reset();
});

test('BFF GET /api/events/[eventId]/guests allows only page and limit query params', async (t) => {
  let capturedUrl = '';
  mock.method(global, 'fetch', async (url: string) => {
    capturedUrl = url;
    return new Response(JSON.stringify({ data: [], meta: { total: 0, page: 2, limit: 15, lastPage: 0 } }), { status: 200 });
  });

  const req = new Request('http://localhost:3001/api/events/event-123/guests?page=2&limit=15&hack=evil&malicious=true', { method: 'GET' });
  const res = await GuestsListGet(req, { params: Promise.resolve({ eventId: 'event-123' }) });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(capturedUrl, 'http://localhost:3000/events/event-123/guests?page=2&limit=15');
  mock.reset();
});

test('BFF POST /api/events/[eventId]/guests forwards valid guest creation', async (t) => {
  let capturedBody = '';
  mock.method(global, 'fetch', async (_url: string, opts: any) => {
    capturedBody = opts.body;
    return new Response(JSON.stringify({ id: 'guest-new', name: 'Budi' }), { status: 200 });
  });

  const req = new Request('http://localhost:3001/api/events/event-123/guests', {
    method: 'POST',
    headers: { 'origin': 'http://localhost:3001', 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Budi', category: 'REGULAR', maxPax: 2 })
  });
  const res = await GuestCreatePost(req, { params: Promise.resolve({ eventId: 'event-123' }) });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(JSON.parse(capturedBody).name, 'Budi');
  mock.reset();
});

test('BFF DELETE /api/events/[eventId] rejects missing/invalid origin', async (t) => {
  const req = new Request('http://localhost:3001/api/events/event-123', {
    method: 'DELETE',
    headers: { 'origin': 'http://evil.com' }
  });
  const res = await EventDelete(req, { params: Promise.resolve({ eventId: 'event-123' }) });
  assert.strictEqual(res.status, 403);
});

test('BFF DELETE /api/events/[eventId] archives event with valid origin', async (t) => {
  let calledUrl = '';
  let calledMethod = '';
  mock.method(global, 'fetch', async (url: string, opts: any) => {
    calledUrl = url;
    calledMethod = opts.method;
    return new Response(JSON.stringify({ success: true, message: 'Event archived successfully' }), { status: 200 });
  });

  const req = new Request('http://localhost:3001/api/events/event-123', {
    method: 'DELETE',
    headers: { 'origin': 'http://localhost:3001' }
  });
  const res = await EventDelete(req, { params: Promise.resolve({ eventId: 'event-123' }) });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(calledUrl, 'http://localhost:3000/events/event-123');
  assert.strictEqual(calledMethod, 'DELETE');
  mock.reset();
});

test('BFF DELETE /api/events/[eventId]/guests/[guestId] deletes guest with valid origin', async (t) => {
  let calledUrl = '';
  let calledMethod = '';
  mock.method(global, 'fetch', async (url: string, opts: any) => {
    calledUrl = url;
    calledMethod = opts.method;
    return new Response(JSON.stringify({ success: true, message: 'Guest deleted successfully' }), { status: 200 });
  });

  const req = new Request('http://localhost:3001/api/events/event-123/guests/guest-456', {
    method: 'DELETE',
    headers: { 'origin': 'http://localhost:3001' }
  });
  const res = await GuestDelete(req, { params: Promise.resolve({ eventId: 'event-123', guestId: 'guest-456' }) });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(calledUrl, 'http://localhost:3000/events/event-123/guests/guest-456');
  assert.strictEqual(calledMethod, 'DELETE');
  mock.reset();
});

test('BFF DELETE /api/events/[eventId]/guests/[guestId] preserves 409 conflict message on attended guest', async (t) => {
  mock.method(global, 'fetch', async () => {
    return new Response(JSON.stringify({ message: 'Cannot delete guest with completed attendance' }), { status: 409 });
  });

  const req = new Request('http://localhost:3001/api/events/event-123/guests/guest-attended', {
    method: 'DELETE',
    headers: { 'origin': 'http://localhost:3001' }
  });
  const res = await GuestDelete(req, { params: Promise.resolve({ eventId: 'event-123', guestId: 'guest-attended' }) });
  assert.strictEqual(res.status, 409);
  const data = await res.json();
  assert.strictEqual(data.message, 'Cannot delete guest with completed attendance');
  mock.reset();
});

test('BFF POST /api/events/[eventId]/invitations/bulk triggers bulk generation', async (t) => {
  let calledUrl = '';
  let calledMethod = '';
  mock.method(global, 'fetch', async (url: string, opts: any) => {
    calledUrl = url;
    calledMethod = opts.method;
    return new Response(JSON.stringify({ totalGuests: 10, created: 5, alreadyExisting: 5, failed: 0 }), { status: 200 });
  });

  const req = new Request('http://localhost:3001/api/events/event-123/invitations/bulk', {
    method: 'POST',
    headers: { 'origin': 'http://localhost:3001' }
  });
  const res = await BulkInvitationsPost(req, { params: Promise.resolve({ eventId: 'event-123' }) });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(calledUrl, 'http://localhost:3000/events/event-123/invitations/bulk');
  assert.strictEqual(calledMethod, 'POST');
  const data = await res.json();
  assert.strictEqual(data.created, 5);
  mock.reset();
});
