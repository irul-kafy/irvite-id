/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fetchPublicEvent, fetchPublicInvitation, fetchPublicTemplateAvailability } from './client';

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
  it('fetchPublicTemplateAvailability returns template availability list on 200', async () => {
    const fakeList = [
      { themeCode: 'IVORY_GARDEN', status: 'AVAILABLE' },
      { themeCode: 'SERENE_GARDEN', status: 'AVAILABLE' },
      { themeCode: 'SUNDA_PUSPA', status: 'AVAILABLE' },
      { themeCode: 'CLASSIC_LETTER', status: 'AVAILABLE' },
      { themeCode: 'VELVET_LETTER', status: 'AVAILABLE' },
    ];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => fakeList,
      } as any;
    }) as any;

    try {
      const res = await fetchPublicTemplateAvailability();
      assert.deepStrictEqual(res, fakeList);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fetchPublicTemplateAvailability returns null on non-200 or network failure (fails closed)', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: false,
        status: 500,
      } as any;
    }) as any;

    try {
      const res = await fetchPublicTemplateAvailability();
      assert.strictEqual(res, null);
    } finally {
      globalThis.fetch = originalFetch;
    }

    // Network error throw
    globalThis.fetch = (async () => {
      throw new Error('Network error');
    }) as any;

    try {
      const res = await fetchPublicTemplateAvailability();
      assert.strictEqual(res, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fetchPublicTemplateAvailability filters out malformed array items', async () => {
    const mixedList = [
      { themeCode: 'IVORY_GARDEN', status: 'AVAILABLE' },
      { invalid: true },
      null,
      'malformed',
      { themeCode: 123, status: 'AVAILABLE' },
      { themeCode: 'SERENE_GARDEN', status: 'HIDDEN' },
    ];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => mixedList,
      } as any;
    }) as any;

    try {
      const res = await fetchPublicTemplateAvailability();
      assert.deepStrictEqual(res, [
        { themeCode: 'IVORY_GARDEN', status: 'AVAILABLE' },
        { themeCode: 'SERENE_GARDEN', status: 'HIDDEN' },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
