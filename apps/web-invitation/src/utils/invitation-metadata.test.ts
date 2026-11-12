import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeAbsoluteUrl,
  formatInvitationEventDate,
  resolveOgImageUrl,
  buildInvitationMetadata,
} from './invitation-metadata';
import type { PublicInvitationResponse } from '../types/public-invitation';
import type { PublicEventResponse } from '../types/public-event';

test('invitation-metadata: makeAbsoluteUrl', async (t) => {
  await t.test('handles empty or missing input safely', () => {
    const res = makeAbsoluteUrl(null, 'https://example.com');
    assert.equal(res, 'https://example.com/logo.png');

    const resEmpty = makeAbsoluteUrl('', 'https://example.com');
    assert.equal(resEmpty, 'https://example.com/logo.png');
  });

  await t.test('preserves fully qualified https/http URLs', () => {
    const url = 'https://images.unsplash.com/photo-123';
    assert.equal(makeAbsoluteUrl(url, 'https://example.com'), url);
  });

  await t.test('prefixes relative api-proxy paths with base URL', () => {
    const path = '/api-proxy/invitations/public/code123/media/m1';
    assert.equal(
      makeAbsoluteUrl(path, 'https://example.com'),
      'https://example.com/api-proxy/invitations/public/code123/media/m1',
    );
  });

  await t.test('automatically inserts api-proxy for /invitations/ and /events/ paths', () => {
    const invPath = '/invitations/public/code123/media/m1';
    assert.equal(
      makeAbsoluteUrl(invPath, 'https://example.com'),
      'https://example.com/api-proxy/invitations/public/code123/media/m1',
    );

    const eventPath = '/events/public/slug-123/media/m2';
    assert.equal(
      makeAbsoluteUrl(eventPath, 'https://example.com'),
      'https://example.com/api-proxy/events/public/slug-123/media/m2',
    );
  });

  await t.test('prefixes standard static assets with base URL', () => {
    const staticAsset = '/templates/royal-velvet/photo-hero.webp';
    assert.equal(
      makeAbsoluteUrl(staticAsset, 'https://example.com'),
      'https://example.com/templates/royal-velvet/photo-hero.webp',
    );
  });
});

test('invitation-metadata: formatInvitationEventDate', async (t) => {
  await t.test('formats ISO date to Indonesian readable format', () => {
    const formatted = formatInvitationEventDate('2027-02-14T09:00:00.000Z');
    assert.ok(formatted?.includes('2027'));
    assert.ok(formatted?.includes('Februari'));
  });

  await t.test('returns null on invalid or empty date', () => {
    assert.equal(formatInvitationEventDate(null), null);
    assert.equal(formatInvitationEventDate(''), null);
    assert.equal(formatInvitationEventDate('invalid-date'), null);
  });
});

test('invitation-metadata: resolveOgImageUrl', async (t) => {
  await t.test('picks preferred hero slot from media list', () => {
    const mediaList = [
      { slot: 'gallery', src: '/gallery-1.jpg', type: 'PHOTO' },
      { slot: 'hero', src: '/invitations/public/code/media/hero-1', type: 'PHOTO' },
      { slot: 'bg-music', src: '/music.mp3', type: 'AUDIO' },
    ];
    const resolved = resolveOgImageUrl(mediaList, 'royal-velvet', 'https://example.com');
    assert.equal(
      resolved,
      'https://example.com/api-proxy/invitations/public/code/media/hero-1',
    );
  });

  await t.test('skips audio and video even if in hero slot', () => {
    const mediaList = [
      { slot: 'hero', src: '/video.mp4', type: 'VIDEO' },
      { slot: 'photo-hero', src: '/photo.jpg', type: 'PHOTO' },
    ];
    const resolved = resolveOgImageUrl(mediaList, 'royal-velvet', 'https://example.com');
    assert.equal(resolved, 'https://example.com/photo.jpg');
  });

  await t.test('falls back to template static photo-hero when mediaList is empty', () => {
    const resolved = resolveOgImageUrl([], 'swarga-dewata', 'https://example.com');
    assert.equal(
      resolved,
      'https://example.com/templates/swarga-dewata/photo-hero.webp',
    );
  });

  await t.test('falls back to logo when theme is unknown and mediaList is empty', () => {
    const resolved = resolveOgImageUrl([], 'unknown-theme', 'https://example.com');
    assert.equal(resolved, 'https://example.com/logo.png');
  });
});

test('invitation-metadata: buildInvitationMetadata', async (t) => {
  const dummyInvitation: PublicInvitationResponse = {
    invitation: { customMessage: 'Harap hadir tepat waktu' },
    guest: {
      name: 'Bapak Ahmad & Partner',
      customGreeting: null,
      maxPax: 2,
      tableNumber: 'VIP-01',
    },
    event: {
      title: 'The Wedding of Citra & Galih (Draf Klien #IRV-999)',
      description: 'Momen sakral janji suci kami',
      eventDate: '2027-02-14T09:00:00.000Z',
      locationDetails: 'Grand Ballroom Hotel Mulia, Jakarta',
    },
    template: {
      themeCode: 'royal-velvet',
      config: null,
    },
    media: [
      {
        slot: 'hero',
        src: '/invitations/public/unique123/media/m-hero',
        order: 0,
        type: 'PHOTO',
      },
    ],
    rsvp: {
      response: 'PENDING',
      pax: null,
      canRespond: true,
    },
  };

  await t.test('builds personalized WhatsApp preview metadata for personal invitation', () => {
    const meta = buildInvitationMetadata(dummyInvitation, { uniqueCode: 'unique123' });

    assert.ok(meta.title?.toString().includes('Citra & Galih'));
    assert.ok(meta.title?.toString().includes('Bapak Ahmad & Partner'));
    assert.ok(meta.description?.includes('Bapak Ahmad & Partner'));
    assert.ok(meta.description?.includes('Hotel Mulia'));

    const og = meta.openGraph as any;
    assert.ok(og);
    assert.ok(og.title.includes('Bapak Ahmad & Partner'));
    assert.ok(og.url.includes('/i/unique123'));
    assert.equal(og.locale, 'id_ID');
    assert.equal(og.images.length, 1);
    assert.ok(og.images[0].url.includes('/api-proxy/invitations/public/unique123/media/m-hero'));

    const twitter = meta.twitter as any;
    assert.ok(twitter);
    assert.equal(twitter.card, 'summary_large_image');
  });

  await t.test('builds public event metadata with optional public recipient', () => {
    const dummyEvent: PublicEventResponse = {
      event: {
        title: 'Pernikahan Citra & Galih',
        description: 'Perayaan cinta kami',
        eventDate: '2027-02-14T09:00:00.000Z',
        locationDetails: 'Bandung',
        slug: 'citra-galih',
      },
      template: {
        themeCode: 'sekar-kedaton',
        config: null,
      },
      media: [],
    };

    const metaWithRecipient = buildInvitationMetadata(dummyEvent, {
      slug: 'citra-galih',
      publicRecipient: 'Ibu Maya',
    });

    assert.ok(metaWithRecipient.title?.toString().includes('Ibu Maya'));
    const og = metaWithRecipient.openGraph as any;
    assert.ok(og.url.includes('/e/citra-galih?to=Ibu%20Maya'));
    assert.ok(og.images[0].url.includes('/templates/sekar-kedaton/photo-hero.webp'));

    const metaGeneric = buildInvitationMetadata(dummyEvent, { slug: 'citra-galih' });
    assert.ok(metaGeneric.title?.toString().includes('Digital Wedding Invitation'));
  });

  await t.test('handles null data gracefully without crashing', () => {
    const fallbackMeta = buildInvitationMetadata(null);
    assert.ok(fallbackMeta.title);
    assert.ok(fallbackMeta.description);
  });
});
