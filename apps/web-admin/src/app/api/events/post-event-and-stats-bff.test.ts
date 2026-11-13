/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

// Setup next/headers mock
let mockCookieValue: string | undefined = 'mock-token';

const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: (name: string) =>
          name === 'auth_token' && mockCookieValue
            ? { value: mockCookieValue }
            : undefined,
      }),
    };
  }
  return origRequire.apply(this, arguments);
};

const {
  GET: PostEventReportGet,
} = require('./[eventId]/attendance/post-event-report/route');
const {
  GET: InvitationStatsGet,
} = require('./[eventId]/invitations/stats/route');

const origFetch = global.fetch;

test('BFF PostEventReport & Stats - 401 when unauthenticated', async () => {
  mockCookieValue = undefined;

  const req1 = new Request(
    'http://localhost:3001/api/events/event-123/attendance/post-event-report',
  );
  const res1 = await PostEventReportGet(req1, {
    params: Promise.resolve({ eventId: 'event-123' }),
  });
  assert.strictEqual(res1.status, 401);

  const req2 = new Request(
    'http://localhost:3001/api/events/event-123/invitations/stats',
  );
  const res2 = await InvitationStatsGet(req2, {
    params: Promise.resolve({ eventId: 'event-123' }),
  });
  assert.strictEqual(res2.status, 401);
});

test('BFF PostEventReport - returns HTML content with text/html header on 200', async () => {
  mockCookieValue = 'valid-token';

  global.fetch = (async () =>
    new Response('<!DOCTYPE html><html><body>Report</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })) as any;

  try {
    const req = new Request(
      'http://localhost:3001/api/events/event-123/attendance/post-event-report',
    );
    const res = await PostEventReportGet(req, {
      params: Promise.resolve({ eventId: 'event-123' }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'text/html; charset=utf-8');
    const text = await res.text();
    assert.match(text, /Report/);
  } finally {
    global.fetch = origFetch;
  }
});

test('BFF InvitationStats - enriches unopened guests with canonicalUrl', async () => {
  mockCookieValue = 'valid-token';

  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        summary: {
          totalInvitations: 1,
          totalEverOpened: 0,
          openRatePercent: 0,
          unopenedCount: 1,
        },
        unopenedGuests: [
          {
            invitationId: 'inv-1',
            guestName: 'Citra',
            uniqueCode: 'citra-code-12345',
          },
        ],
        recentlyOpened: [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )) as any;

  try {
    const req = new Request(
      'http://localhost:3001/api/events/event-123/invitations/stats',
    );
    const res = await InvitationStatsGet(req, {
      params: Promise.resolve({ eventId: 'event-123' }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.unopenedGuests.length, 1);
    assert.ok(data.unopenedGuests[0].canonicalUrl);
    assert.match(data.unopenedGuests[0].canonicalUrl, /citra-code-12345/);
  } finally {
    global.fetch = origFetch;
  }
});

