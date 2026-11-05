/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';

let mockToken: string | undefined;
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: () => (mockToken ? { value: mockToken } : undefined),
        delete: () => {},
      }),
    };
  }
  return originalRequire.call(this, id);
};

const {
  buildAdminNotifications,
  buildScannerNotifications,
  GET,
} = require('./route');
(Module.prototype as any).require = originalRequire;

describe('Admin Notifications Engine', () => {
  it('identifies client drafts from studio and creates CLIENT_DRAFT notifications', () => {
    const events = [
      {
        id: 'evt-1',
        title: 'Pernikahan Sasa & Bagas (Draf Klien #IRV-64A801)',
        slug: 'sasa-bagas',
        status: 'DRAFT',
        eventDate: '2027-06-20T01:00:00.000Z',
        createdAt: '2026-11-04T10:00:00.000Z',
      },
    ];

    const notifications = buildAdminNotifications(events);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].category, 'CLIENT_DRAFT');
    assert.equal(notifications[0].level, 'SUCCESS');
    assert.match(notifications[0].title, /Draf Klien Masuk/);
    assert.match(notifications[0].title, /Sasa & Bagas/);
    assert.equal(notifications[0].actionUrl, '/events/evt-1');
    assert.equal(notifications[0].tag, 'Draf Klien');
  });

  it('generates urgent notifications for events happening today (H-0)', () => {
    const today = new Date();
    const events = [
      {
        id: 'evt-today',
        title: 'Pernikahan Lyra & Elian',
        slug: 'lyra-elian',
        status: 'PUBLISHED',
        eventDate: today.toISOString(),
        locationDetails: 'Grand Ballroom Hotel Mulia',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const notifications = buildAdminNotifications(events);
    const todayNotif = notifications.find((n: any) => n.id === 'today-evt-today');
    assert.ok(todayNotif, 'Should generate today notification');
    assert.equal(todayNotif.level, 'URGENT');
    assert.equal(todayNotif.tag, 'Hari Ini');
    assert.match(todayNotif.title, /Hari Ini/);
    assert.equal(todayNotif.actionUrl, '/events/evt-today/monitor');
  });

  it('generates warning notification for events happening tomorrow (H-1)', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = [
      {
        id: 'evt-tmrw',
        title: 'Pernikahan Nara & Arka',
        slug: 'nara-arka',
        status: 'PUBLISHED',
        eventDate: tomorrow.toISOString(),
        locationDetails: 'Sasana Kriya, TMII',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const notifications = buildAdminNotifications(events);
    const tmrwNotif = notifications.find((n: any) => n.id === 'tomorrow-evt-tmrw');
    assert.ok(tmrwNotif, 'Should generate tomorrow notification');
    assert.equal(tmrwNotif.level, 'WARNING');
    assert.equal(tmrwNotif.tag, 'H-1');
    assert.match(tmrwNotif.title, /Besok/);
  });

  it('generates countdown reminder for events H-2 to H-7', () => {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    const events = [
      {
        id: 'evt-h3',
        title: 'Pernikahan Citra & Reza',
        slug: 'citra-reza',
        status: 'PUBLISHED',
        eventDate: in3Days.toISOString(),
        locationDetails: 'Plataran Dharmawangsa',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const notifications = buildAdminNotifications(events);
    const h3Notif = notifications.find((n: any) => n.id === 'upcoming-evt-h3-3');
    assert.ok(h3Notif, 'Should generate H-3 notification');
    assert.equal(h3Notif.level, 'INFO');
    assert.equal(h3Notif.tag, 'H-3');
    assert.match(h3Notif.title, /H-3/);
  });

  it('generates readiness warning when event is within 14 days and location is missing', () => {
    const in5Days = new Date();
    in5Days.setDate(in5Days.getDate() + 5);

    const events = [
      {
        id: 'evt-noloc',
        title: 'Pernikahan Maya & Dimas',
        slug: 'maya-dimas',
        status: 'PUBLISHED',
        eventDate: in5Days.toISOString(),
        locationDetails: '', // Missing location!
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const notifications = buildAdminNotifications(events);
    const locNotif = notifications.find((n: any) => n.id === 'readiness-loc-evt-noloc');
    assert.ok(locNotif, 'Should generate location readiness warning');
    assert.equal(locNotif.category, 'READINESS');
    assert.equal(locNotif.level, 'WARNING');
    assert.equal(locNotif.actionUrl, '/events/evt-noloc/edit');
  });

  it('strictly ignores archived events', () => {
    const today = new Date();
    const events = [
      {
        id: 'evt-archived',
        title: 'Archived Wedding',
        slug: 'archived',
        status: 'ARCHIVED',
        eventDate: today.toISOString(),
      },
    ];

    const notifications = buildAdminNotifications(events);
    assert.equal(notifications.length, 0);
  });

  it('buildScannerNotifications creates staff task reminders for today', () => {
    const today = new Date();
    const scannerEvents = [
      {
        event: {
          id: 'scan-1',
          title: 'Pernikahan Sekar & Danang',
          status: 'PUBLISHED',
          eventDate: today.toISOString(),
        },
      },
    ];

    const notifications = buildScannerNotifications(scannerEvents);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].level, 'URGENT');
    assert.equal(notifications[0].tag, 'Tugas Hari Ini');
    assert.equal(notifications[0].actionUrl, '/events/scan-1/scanner');
  });

  it('GET /api/notifications returns 401 when token cookie is missing', async () => {
    mockToken = undefined;
    const res = await GET();
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.message, 'Unauthorized');
  });

  it('GET /api/notifications returns 200 with notifications when authenticated', async () => {
    mockToken = 'valid-mock-token';
    const origFetch = global.fetch;
    global.fetch = (async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'evt-test-1',
              title: 'Pernikahan Draf Klien #IRV-999',
              status: 'DRAFT',
              createdAt: '2026-11-05T00:00:00.000Z',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    try {
      const res = await GET();
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(Array.isArray(json.notifications));
      assert.equal(json.notifications.length, 1);
      assert.equal(json.notifications[0].category, 'CLIENT_DRAFT');
    } finally {
      global.fetch = origFetch;
      mockToken = undefined;
    }
  });
});
