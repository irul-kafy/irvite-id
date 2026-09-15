import test from 'node:test';
import assert from 'node:assert';
import {
  adaptSereneGardenContent,
  adaptSereneGardenMedia,
} from './serene-garden.adapter';
import type { PublicMediaDescriptor } from '../../types/public-invitation';

test('Serene Garden: Content & Media Adapters', async (t) => {
  await t.test('adapts valid SERENE_GARDEN content and preserves text accountNumber with leading zeros', () => {
    const raw = {
      partnerOneName: 'Alya',
      partnerTwoName: 'Raka',
      partnerOneFullName: 'Alya Putri Wijaya',
      partnerTwoFullName: 'Raka Pratama Nugraha',
      partnerOneParents: 'Bapak Wijaya & Ibu Siti',
      partnerTwoParents: 'Bapak Nugraha & Ibu Dewi',
      openingText: 'Dengan memohon rahmat Allah...',
      prayerText: 'Dan di antara tanda-tanda-Nya...',
      closingText: 'Merupakan kehormatan bagi kami...',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-12-20T08:00',
          endDateTime: '2026-12-20T10:00',
          venue: 'Masjid Raya Al-Ikhlas',
          address: 'Jl. Merdeka No. 45',
          mapsUrl: 'https://maps.app.goo.gl/abc',
        },
      ],
      giftTitle: 'Tanda Kasih',
      giftMessage: 'Doa restu Anda...',
      giftAccounts: [
        {
          bankName: 'BCA',
          accountNumber: '001234567890',
          accountHolderName: 'Alya Putri Wijaya',
        },
      ],
      _schemaVersion: 1,
    };

    const adapted = adaptSereneGardenContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.partnerOneName, 'Alya');
    assert.strictEqual(adapted.partnerTwoName, 'Raka');
    assert.strictEqual(adapted.partnerOneFullName, 'Alya Putri Wijaya');
    assert.strictEqual(adapted.partnerTwoFullName, 'Raka Pratama Nugraha');
    assert.strictEqual(adapted.ceremonies?.length, 1);
    assert.strictEqual(adapted.ceremonies?.[0].startDateTime, '2026-12-20T08:00');
    assert.strictEqual(adapted.ceremonies?.[0].endDateTime, '2026-12-20T10:00');
    assert.strictEqual(adapted.giftAccounts?.[0].accountNumber, '001234567890');
    assert.strictEqual(typeof adapted.giftAccounts?.[0].accountNumber, 'string');
    assert.strictEqual(adapted._schemaVersion, 1);
  });

  await t.test('bounds ceremonies to max 2 items', () => {
    const raw = {
      partnerOneName: 'Alya',
      partnerTwoName: 'Raka',
      ceremonies: [
        { title: '1', startDateTime: '2026-12-20T08:00', venue: 'V1' },
        { title: '2', startDateTime: '2026-12-20T11:00', venue: 'V2' },
        { title: '3', startDateTime: '2026-12-20T18:00', venue: 'V3' },
      ],
    };
    const adapted = adaptSereneGardenContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.ceremonies?.length, 2);
    assert.strictEqual(adapted.ceremonies?.[0].title, '1');
    assert.strictEqual(adapted.ceremonies?.[1].title, '2');
  });

  await t.test('bounds giftAccounts to max 3 items', () => {
    const raw = {
      partnerOneName: 'Alya',
      partnerTwoName: 'Raka',
      giftAccounts: [
        { bankName: 'B1', accountNumber: '01', accountHolderName: 'H1' },
        { bankName: 'B2', accountNumber: '02', accountHolderName: 'H2' },
        { bankName: 'B3', accountNumber: '03', accountHolderName: 'H3' },
        { bankName: 'B4', accountNumber: '04', accountHolderName: 'H4' },
      ],
    };
    const adapted = adaptSereneGardenContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.giftAccounts?.length, 3);
  });

  await t.test('fails closed (returns null) for empty or non-object content', () => {
    assert.strictEqual(adaptSereneGardenContent(null), null);
    assert.strictEqual(adaptSereneGardenContent(undefined), null);
    assert.strictEqual(adaptSereneGardenContent(''), null);
    assert.strictEqual(adaptSereneGardenContent({}), null);
    assert.strictEqual(adaptSereneGardenContent([]), null);
  });

  await t.test('adapts media slots correctly (partner-one-photo, partner-two-photo)', () => {
    const mediaList: PublicMediaDescriptor[] = [
      { id: '1', slot: 'partner-one-photo', type: 'PHOTO', order: 1, src: '/media/p1.jpg' },
      { id: '2', slot: 'partner-two-photo', type: 'PHOTO', order: 2, src: '/media/p2.jpg' },
      { id: '3', slot: 'gallery', type: 'PHOTO', order: 3, src: '/media/gal.jpg' },
      { id: '4', slot: 'bg-music', type: 'AUDIO', order: 4, src: '/media/song.mp3' },
    ];

    const adapted = adaptSereneGardenMedia(undefined, mediaList);
    assert.ok(adapted);
    assert.strictEqual(adapted.partnerOnePhoto?.src, '/media/p1.jpg');
    assert.strictEqual(adapted.partnerTwoPhoto?.src, '/media/p2.jpg');
    assert.strictEqual((adapted as Record<string, unknown>).gallery, undefined);
    assert.strictEqual((adapted as Record<string, unknown>).bgMusic, undefined);
  });

  await t.test('handles missing media slots gracefully without throwing', () => {
    const adapted = adaptSereneGardenMedia({}, []);
    assert.ok(adapted);
    assert.strictEqual(adapted.partnerOnePhoto, undefined);
    assert.strictEqual(adapted.partnerTwoPhoto, undefined);
  });
});
