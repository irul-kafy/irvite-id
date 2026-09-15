import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  adaptIvoryGardenContent,
  adaptIvoryGardenMedia,
} from './ivory-garden.adapter';

describe('Phase #8A: Ivory Garden Content & Media Adapters', () => {
  it('adapts valid IVORY_GARDEN content and preserves text accountNumber with leading zero', () => {
    const raw = {
      partnerOneName: 'Aditya Pratama',
      partnerTwoName: 'Citra Kirana',
      partnerOneParents: 'Bpk. Hendra & Ibu Susi',
      partnerTwoParents: 'Bpk. Budi & Ibu Ratna',
      openingText: 'Dengan memohon rahmat Allah SWT...',
      prayerText: 'Dan di antara tanda-tanda kebesaran-Nya...',
      prayerSource: 'QS. Ar-Rum: 21',
      closingText: 'Merupakan kehormatan bagi kami...',
      timeZone: 'Asia/Jakarta',
      mapsUrl: 'https://maps.google.com/?q=venue',
      ceremonies: [
        {
          title: 'Akad Nikah',
          dateTime: '2026-12-20T08:00',
          venue: 'Masjid Agung',
          address: 'Jl. Pemuda No. 1',
          mapsUrl: 'https://maps.google.com/?q=masjid',
        },
        {
          title: 'Resepsi',
          dateTime: '2026-12-20T11:00',
          venue: 'Grand Ballroom',
          address: 'Jl. Sudirman No. 10',
        },
      ],
      giftTitle: 'Amplop Digital',
      giftMessage: 'Doa restu Anda adalah hadiah terindah bagi kami.',
      giftAccounts: [
        {
          bankName: 'BCA',
          accountNumber: '001234567890', // Leading zero test
          accountHolderName: 'Aditya Pratama',
        },
      ],
      giftQr: 'malicious-qr',
      paymentGateway: 'midtrans',
    };

    const adapted = adaptIvoryGardenContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.partnerOneName, 'Aditya Pratama');
    assert.strictEqual(adapted.partnerTwoName, 'Citra Kirana');
    assert.strictEqual(adapted.ceremonies?.length, 2);
    assert.strictEqual(adapted.giftAccounts?.length, 1);
    assert.strictEqual(adapted.giftAccounts[0].accountNumber, '001234567890');
    assert.strictEqual((adapted as Record<string, unknown>).giftQr, undefined);
    assert.strictEqual((adapted as Record<string, unknown>).paymentGateway, undefined);
  });

  it('bounds ceremonies to max 2 items', () => {
    const raw = {
      partnerOneName: 'A',
      ceremonies: [
        { title: 'C1', dateTime: '2026-12-20T08:00', venue: 'V1', address: 'A1' },
        { title: 'C2', dateTime: '2026-12-20T11:00', venue: 'V2', address: 'A2' },
        { title: 'C3', dateTime: '2026-12-20T15:00', venue: 'V3', address: 'A3' },
      ],
    };

    const adapted = adaptIvoryGardenContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.ceremonies?.length, 2);
    assert.strictEqual(adapted.ceremonies[0].title, 'C1');
    assert.strictEqual(adapted.ceremonies[1].title, 'C2');
  });

  it('bounds giftAccounts to max 3 items', () => {
    const raw = {
      giftTitle: 'Hadiah',
      giftAccounts: [
        { bankName: 'BCA', accountNumber: '01', accountHolderName: 'A' },
        { bankName: 'Mandiri', accountNumber: '02', accountHolderName: 'B' },
        { bankName: 'BNI', accountNumber: '03', accountHolderName: 'C' },
        { bankName: 'BRI', accountNumber: '04', accountHolderName: 'D' },
      ],
    };

    const adapted = adaptIvoryGardenContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.giftAccounts?.length, 3);
    assert.strictEqual(adapted.giftAccounts[2].bankName, 'BNI');
  });

  it('fails closed (returns null) for empty or non-object content', () => {
    assert.strictEqual(adaptIvoryGardenContent(null), null);
    assert.strictEqual(adaptIvoryGardenContent({}), null);
    assert.strictEqual(adaptIvoryGardenContent('string'), null);
    assert.strictEqual(adaptIvoryGardenContent([]), null);
  });

  it('adapts media slots correctly (hero, gallery 0-6, bgMusic)', () => {
    const mediaBySlot = {
      hero: [
        { id: 'm-1', type: 'PHOTO' as const, slot: 'hero', order: 0, src: '/events/public/slug/media/m-1' },
      ],
      gallery: [
        { id: 'g-1', type: 'PHOTO' as const, slot: 'gallery', order: 0, src: '/events/public/slug/media/g-1' },
        { id: 'g-2', type: 'PHOTO' as const, slot: 'gallery', order: 1, src: '/events/public/slug/media/g-2' },
      ],
      'bg-music': [
        { id: 'a-1', type: 'AUDIO' as const, slot: 'bg-music', order: 0, src: '/events/public/slug/media/a-1' },
      ],
    };

    const adapted = adaptIvoryGardenMedia(mediaBySlot);
    assert.ok(adapted.hero);
    assert.strictEqual(adapted.hero.src, '/events/public/slug/media/m-1');
    assert.strictEqual(adapted.gallery.length, 2);
    assert.strictEqual(adapted.gallery[0].src, '/events/public/slug/media/g-1');
    assert.ok(adapted.bgMusic);
    assert.strictEqual(adapted.bgMusic.src, '/events/public/slug/media/a-1');
  });

  it('handles missing media slots gracefully without throwing', () => {
    const adapted = adaptIvoryGardenMedia({});
    assert.strictEqual(adapted.hero, undefined);
    assert.deepStrictEqual(adapted.gallery, []);
    assert.strictEqual(adapted.bgMusic, undefined);
  });
});
