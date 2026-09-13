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

const { GET: GuestsExportGet } = require('./[eventId]/guests/export/route');
const {
  GET: AttendanceReportGet,
} = require('./[eventId]/attendance/report/route');

const origFetch = global.fetch;

test('BFF Export - Unauthenticated returns 401', async () => {
  mockCookieValue = undefined;

  const req1 = new Request(
    'http://localhost:3001/api/events/event-123/guests/export',
  );
  const res1 = await GuestsExportGet(req1, {
    params: Promise.resolve({ eventId: 'event-123' }),
  });
  assert.strictEqual(res1.status, 401);

  const req2 = new Request(
    'http://localhost:3001/api/events/event-123/attendance/report',
  );
  const res2 = await AttendanceReportGet(req2, {
    params: Promise.resolve({ eventId: 'event-123' }),
  });
  assert.strictEqual(res2.status, 401);
});

test('BFF Export - Upstream 401 clears auth_token cookie', async () => {
  mockCookieValue = 'expired-token';

  global.fetch = (async () =>
    new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
    })) as any;

  try {
    const req = new Request(
      'http://localhost:3001/api/events/event-123/guests/export',
    );
    const res = await GuestsExportGet(req, {
      params: Promise.resolve({ eventId: 'event-123' }),
    });

    assert.strictEqual(res.status, 401);
    assert.ok(
      res.cookies?.get('auth_token') === undefined ||
        res.headers.get('set-cookie')?.includes('auth_token=;'),
    );
  } finally {
    global.fetch = origFetch;
  }
});

test('BFF Export - Forwards query parameters and passes through 200 binary response with headers', async () => {
  mockCookieValue = 'valid-token';
  let capturedUrl = '';
  let capturedHeaders: Record<string, string> = {};

  const fakeBuffer = Buffer.from('fake-excel-content');

  global.fetch = (async (url: string, init?: any) => {
    capturedUrl = url;
    capturedHeaders = init?.headers || {};
    return new Response(fakeBuffer, {
      status: 200,
      headers: {
        'content-type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition':
          'attachment; filename="data-tamu-event-123-20260913.xlsx"',
      },
    });
  }) as any;

  try {
    const req = new Request(
      'http://localhost:3001/api/events/event-123/guests/export?format=xlsx&rsvp=yes&attendance=checked-in&category=VIP',
    );
    const res = await GuestsExportGet(req, {
      params: Promise.resolve({ eventId: 'event-123' }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(
      res.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    assert.strictEqual(
      res.headers.get('content-disposition'),
      'attachment; filename="data-tamu-event-123-20260913.xlsx"',
    );
    assert.strictEqual(res.headers.get('cache-control'), 'no-store');

    assert.ok(capturedUrl.includes('/events/event-123/guests/export'));
    assert.ok(capturedUrl.includes('format=xlsx'));
    assert.ok(capturedUrl.includes('rsvp=yes'));
    assert.ok(capturedUrl.includes('attendance=checked-in'));
    assert.ok(capturedUrl.includes('category=VIP'));
    assert.strictEqual(capturedHeaders['Authorization'], 'Bearer valid-token');

    const body = await res.arrayBuffer();
    assert.strictEqual(Buffer.from(body).toString(), 'fake-excel-content');
  } finally {
    global.fetch = origFetch;
  }
});

test('BFF Attendance Report - Forwards 403 Forbidden', async () => {
  mockCookieValue = 'staff-token';

  global.fetch = (async () =>
    new Response(JSON.stringify({ message: 'Forbidden' }), {
      status: 403,
    })) as any;

  try {
    const req = new Request(
      'http://localhost:3001/api/events/event-123/attendance/report',
    );
    const res = await AttendanceReportGet(req, {
      params: Promise.resolve({ eventId: 'event-123' }),
    });

    assert.strictEqual(res.status, 403);
  } finally {
    global.fetch = origFetch;
  }
});

test('BFF Attendance Report - Forwards 400 Bad Request with error message', async () => {
  mockCookieValue = 'admin-token';

  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        message:
          'Jumlah data tamu melebihi batas ekspor 5.000 baris. Silakan gunakan filter kategori, RSVP, atau kehadiran yang lebih spesifik.',
      }),
      { status: 400 },
    )) as any;

  try {
    const req = new Request(
      'http://localhost:3001/api/events/event-123/attendance/report',
    );
    const res = await AttendanceReportGet(req, {
      params: Promise.resolve({ eventId: 'event-123' }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.message.includes('5.000 baris'));
  } finally {
    global.fetch = origFetch;
  }
});

test('BFF Validation - Invalid format returns 400', async () => {
  mockCookieValue = 'valid-token';
  const req = new Request(
    'http://localhost:3001/api/events/event-123/guests/export?format=pdf',
  );
  const res = await GuestsExportGet(req, {
    params: Promise.resolve({ eventId: 'event-123' }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.message.includes('Format tidak valid'));
});

test('BFF Validation - Invalid rsvp returns 400', async () => {
  mockCookieValue = 'valid-token';
  const req = new Request(
    'http://localhost:3001/api/events/event-123/guests/export?rsvp=maybe',
  );
  const res = await GuestsExportGet(req, {
    params: Promise.resolve({ eventId: 'event-123' }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.message.includes('Filter RSVP tidak valid'));
});

test('BFF Validation - Invalid attendance returns 400', async () => {
  mockCookieValue = 'valid-token';
  const req = new Request(
    'http://localhost:3001/api/events/event-123/attendance/report?attendance=present',
  );
  const res = await AttendanceReportGet(req, {
    params: Promise.resolve({ eventId: 'event-123' }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.message.includes('Filter kehadiran tidak valid'));
});

test('BFF Validation - Category over 50 chars returns 400', async () => {
  mockCookieValue = 'valid-token';
  const longCat = 'A'.repeat(51);
  const req = new Request(
    `http://localhost:3001/api/events/event-123/guests/export?category=${longCat}`,
  );
  const res = await GuestsExportGet(req, {
    params: Promise.resolve({ eventId: 'event-123' }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.message.includes('Filter kategori maksimal 50 karakter'));
});
