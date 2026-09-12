import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { fetchPublicEvent, fetchPublicInvitation } from './client';

describe('Web Invitation API Client', () => {
  it('fetchPublicInvitation returns invitation data on 200', async () => {
    const fakeData = {
      event: { title: 'Test Wedding', eventDate: '2026-10-10T00:00:00Z', description: null, locationDetails: null },
      guest: { name: 'Alice', customGreeting: null, maxPax: 2 },
      invitation: { customMessage: null },
      template: { themeCode: 'VERDANT', config: null },
      media: [],
      rsvp: { response: 'PENDING', pax: null, canRespond: true },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => fakeData,
      } as any;
    }) as any;

    try {
      const res = await fetchPublicInvitation('test-code-123456789012');
      assert.deepStrictEqual(res, fakeData);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fetchPublicInvitation returns null on 404', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: false,
        status: 404,
      } as any;
    }) as any;

    try {
      const res = await fetchPublicInvitation('missing-code-12345678');
      assert.strictEqual(res, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fetchPublicEvent returns public event data on 200', async () => {
    const fakeEvent = {
      event: {
        title: 'Sarah & Michael Wedding',
        description: 'Welcome to our celebration',
        eventDate: '2026-12-12T10:00:00Z',
        locationDetails: 'Jakarta',
        slug: 'sarah-michael-2026',
      },
      template: { themeCode: 'BOTANICAL', config: null },
      media: [],
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => fakeEvent,
      } as any;
    }) as any;

    try {
      const res = await fetchPublicEvent('sarah-michael-2026');
      assert.deepStrictEqual(res, fakeEvent);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fetchPublicEvent returns null on 404', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: false,
        status: 404,
      } as any;
    }) as any;

    try {
      const res = await fetchPublicEvent('nonexistent-slug');
      assert.strictEqual(res, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
