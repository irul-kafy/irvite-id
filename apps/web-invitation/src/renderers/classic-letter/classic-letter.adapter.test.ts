import test from 'node:test';
import assert from 'node:assert';
import {
  adaptClassicLetterContent,
  adaptClassicLetterMedia,
} from './classic-letter.adapter';
import type { PublicMediaDescriptor } from '../../types/public-invitation';

test('Classic Letter: Content & Media Adapters', async (t) => {
  await t.test('adapts valid CLASSIC_LETTER content and trims string fields', () => {
    const raw = {
      partnerOneName: '  Nadira  ',
      partnerTwoName: '  Arga  ',
      partnerOneFullName: 'Nadira Putri',
      partnerTwoFullName: 'Arga Pratama',
      partnerOneFamily: 'Putri pertama dari Bapak Hendra & Ibu Maya',
      partnerTwoFamily: 'Putra kedua dari Bapak Surya & Ibu Diana',
      intro: 'Sebuah janji untuk selamanya...',
      quote: 'Some stories are written to last.',
      prayer: 'Dan di antara tanda-tanda kebesaran-Nya...',
      closing: 'Merupakan kehormatan bagi kami...',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-11-22T08:00',
          endDateTime: '2026-11-22T10:00',
          venue: 'Gedung Kesenian Jakarta',
          address: 'Jl. Gedung Kesenian No. 1, Jakarta Pusat',
          mapsUrl: 'https://maps.google.com/?q=Gedung+Kesenian',
        },
        {
          title: 'Resepsi',
          startDateTime: '2026-11-22T11:00',
          endDateTime: '2026-11-22T14:00',
          venue: 'Grand Ballroom Hotel Indonesia',
        },
      ],
      giftAccounts: [
        {
          bankName: 'BCA',
          accountNumber: '0123456789',
          accountHolder: 'Nadira Putri',
        },
      ],
    };

    const adapted = adaptClassicLetterContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.partnerOneName, 'Nadira');
    assert.strictEqual(adapted.partnerTwoName, 'Arga');
    assert.strictEqual(adapted.partnerOneFullName, 'Nadira Putri');
    assert.strictEqual(adapted.partnerTwoFullName, 'Arga Pratama');
    assert.strictEqual(adapted.partnerOneFamily, 'Putri pertama dari Bapak Hendra & Ibu Maya');
    assert.strictEqual(adapted.partnerTwoFamily, 'Putra kedua dari Bapak Surya & Ibu Diana');
    assert.strictEqual(adapted.intro, 'Sebuah janji untuk selamanya...');
    assert.strictEqual(adapted.quote, 'Some stories are written to last.');
    assert.strictEqual(adapted.prayer, 'Dan di antara tanda-tanda kebesaran-Nya...');
    assert.strictEqual(adapted.closing, 'Merupakan kehormatan bagi kami...');
    assert.strictEqual(adapted.timeZone, 'Asia/Jakarta');
    assert.strictEqual(adapted.ceremonies?.length, 2);
    assert.strictEqual(adapted.giftAccounts?.length, 1);
    // Strict preservation of accountNumber as string including leading zero
    assert.strictEqual(adapted.giftAccounts?.[0].accountNumber, '0123456789');
    assert.strictEqual(typeof adapted.giftAccounts?.[0].accountNumber, 'string');
  });

  await t.test('fails closed on invalid or missing required content fields', () => {
    assert.strictEqual(adaptClassicLetterContent(null), null);
    assert.strictEqual(adaptClassicLetterContent({}), null);
    assert.strictEqual(adaptClassicLetterContent({ partnerOneName: 'Nadira' }), null);
    assert.strictEqual(
      adaptClassicLetterContent({ partnerOneName: 'Nadira', partnerTwoName: 'Arga' }),
      null,
    );
    assert.strictEqual(
      adaptClassicLetterContent({
        partnerOneName: 'Nadira',
        partnerTwoName: 'Arga',
        timeZone: 'Europe/London',
      }),
      null,
    );
  });

  await t.test('gracefully handles absent optional fields without fabricating copy', () => {
    const minimal = {
      partnerOneName: 'Nadira',
      partnerTwoName: 'Arga',
      timeZone: 'Asia/Jakarta',
    };
    const adapted = adaptClassicLetterContent(minimal);
    assert.ok(adapted);
    assert.strictEqual(adapted.partnerOneName, 'Nadira');
    assert.strictEqual(adapted.partnerTwoName, 'Arga');
    assert.strictEqual(adapted.partnerOneFullName, undefined);
    assert.strictEqual(adapted.partnerTwoFullName, undefined);
    assert.strictEqual(adapted.partnerOneFamily, undefined);
    assert.strictEqual(adapted.partnerTwoFamily, undefined);
    assert.strictEqual(adapted.intro, undefined);
    assert.strictEqual(adapted.quote, undefined);
    assert.strictEqual(adapted.prayer, undefined);
    assert.strictEqual(adapted.closing, undefined);
    assert.strictEqual(adapted.ceremonies, undefined);
    assert.strictEqual(adapted.giftAccounts, undefined);
  });

  await t.test('caps ceremonies and giftAccounts at max 2 items', () => {
    const raw = {
      partnerOneName: 'Nadira',
      partnerTwoName: 'Arga',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        { title: 'C1', startDateTime: '2026-11-22T08:00', venue: 'V1' },
        { title: 'C2', startDateTime: '2026-11-22T10:00', venue: 'V2' },
        { title: 'C3', startDateTime: '2026-11-22T12:00', venue: 'V3' },
      ],
      giftAccounts: [
        { bankName: 'BCA', accountNumber: '001', accountHolder: 'Nadira' },
        { bankName: 'Mandiri', accountNumber: '002', accountHolder: 'Arga' },
        { bankName: 'BNI', accountNumber: '003', accountHolder: 'Nadira' },
      ],
    };
    const adapted = adaptClassicLetterContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.ceremonies?.length, 2);
    assert.strictEqual(adapted.giftAccounts?.length, 2);
    assert.strictEqual(adapted.giftAccounts?.[0].accountNumber, '001');
    assert.strictEqual(adapted.giftAccounts?.[1].accountNumber, '002');
  });

  await t.test('media adapter: resolves static defaults when no uploaded media exists', () => {
    const media = adaptClassicLetterMedia({}, []);
    assert.strictEqual(media.resolvedBg.type, 'photo');
    assert.strictEqual(media.resolvedBg.photoSrc, '/templates/classic-letter/garden.jpg');
    assert.strictEqual(media.resolvedBg.posterSrc, '/templates/classic-letter/flowers-poster.jpg');
    assert.strictEqual(media.resolvedBg.videoSrc, undefined);
    assert.strictEqual(media.gallery.length, 0);
    assert.strictEqual(media.couplePhoto, undefined);
  });

  await t.test('media adapter: resolves uploaded bg-video precedence and poster fallback', () => {
    const videoSlot: PublicMediaDescriptor = {
      id: 'm1',
      type: 'VIDEO',
      slot: 'bg-video',
      order: 0,
      src: 'https://cdn.irvite.id/video.mp4',
    };
    const posterSlot: PublicMediaDescriptor = {
      id: 'm2',
      type: 'PHOTO',
      slot: 'bg-poster',
      order: 0,
      src: 'https://cdn.irvite.id/custom-poster.jpg',
    };

    const mediaWithPoster = adaptClassicLetterMedia({
      'bg-video': [videoSlot],
      'bg-poster': [posterSlot],
    });
    assert.strictEqual(mediaWithPoster.resolvedBg.type, 'video');
    assert.strictEqual(mediaWithPoster.resolvedBg.videoSrc, 'https://cdn.irvite.id/video.mp4');
    assert.strictEqual(mediaWithPoster.resolvedBg.posterSrc, 'https://cdn.irvite.id/custom-poster.jpg');

    const mediaWithoutPoster = adaptClassicLetterMedia({
      'bg-video': [videoSlot],
    });
    assert.strictEqual(mediaWithoutPoster.resolvedBg.type, 'video');
    assert.strictEqual(mediaWithoutPoster.resolvedBg.posterSrc, '/templates/classic-letter/flowers-poster.jpg');
  });

  await t.test('media adapter: resolves uploaded bg-photo when no bg-video exists', () => {
    const photoSlot: PublicMediaDescriptor = {
      id: 'm1',
      type: 'PHOTO',
      slot: 'bg-photo',
      order: 0,
      src: 'https://cdn.irvite.id/custom-garden.jpg',
    };

    const media = adaptClassicLetterMedia({
      'bg-photo': [photoSlot],
    });
    assert.strictEqual(media.resolvedBg.type, 'photo');
    assert.strictEqual(media.resolvedBg.photoSrc, 'https://cdn.irvite.id/custom-garden.jpg');
    assert.strictEqual(media.resolvedBg.videoSrc, undefined);
  });

  await t.test('media adapter: caps gallery at max 2 photos and deduplicates', () => {
    const galleryItems: PublicMediaDescriptor[] = [
      { id: 'g1', type: 'PHOTO', slot: 'gallery', order: 0, src: 'https://cdn.irvite.id/p1.jpg' },
      { id: 'g1', type: 'PHOTO', slot: 'gallery', order: 1, src: 'https://cdn.irvite.id/p1.jpg' },
      { id: 'g2', type: 'PHOTO', slot: 'gallery', order: 2, src: 'https://cdn.irvite.id/p2.jpg' },
      { id: 'g3', type: 'PHOTO', slot: 'gallery', order: 3, src: 'https://cdn.irvite.id/p3.jpg' },
    ];
    const media = adaptClassicLetterMedia({ gallery: galleryItems });
    assert.strictEqual(media.gallery.length, 2);
    assert.strictEqual(media.gallery[0].src, 'https://cdn.irvite.id/p1.jpg');
    assert.strictEqual(media.gallery[1].src, 'https://cdn.irvite.id/p2.jpg');
  });
});
