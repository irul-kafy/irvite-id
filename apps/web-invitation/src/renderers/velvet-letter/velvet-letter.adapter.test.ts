import test from 'node:test';
import assert from 'node:assert';
import {
  adaptVelvetLetterContent,
  adaptVelvetLetterMedia,
} from './velvet-letter.adapter';
import type { PublicMediaDescriptor } from '../../types/public-invitation';

test('Velvet Letter: Content & Media Adapters', async (t) => {
  await t.test('adapts valid minimal VELVET_LETTER content and trims string fields', () => {
    const raw = {
      partnerOneName: '  Nadira  ',
      partnerTwoName: '  Arga  ',
      timeZone: 'Asia/Jakarta',
    };

    const adapted = adaptVelvetLetterContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.partnerOneName, 'Nadira');
    assert.strictEqual(adapted.partnerTwoName, 'Arga');
    assert.strictEqual(adapted.timeZone, 'Asia/Jakarta');
    assert.strictEqual(adapted.partnerOneFullName, undefined);
    assert.strictEqual(adapted.partnerTwoFullName, undefined);
  });

  await t.test('adapts complete VELVET_LETTER content with optional fields', () => {
    const raw = {
      partnerOneName: 'Nadira',
      partnerTwoName: 'Arga',
      partnerOneFullName: 'Nadira Putri',
      partnerTwoFullName: 'Arga Pratama',
      partnerOneFamily: 'Keluarga Bapak Hendra',
      partnerTwoFamily: 'Keluarga Bapak Surya',
      intro: 'Teks pembuka...',
      prayer: 'Teks doa...',
      closing: 'Teks penutup...',
      giftMessage: 'Pesan kado...',
      timeZone: 'Asia/Makassar',
    };

    const adapted = adaptVelvetLetterContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.partnerOneFullName, 'Nadira Putri');
    assert.strictEqual(adapted.partnerTwoFullName, 'Arga Pratama');
    assert.strictEqual(adapted.partnerOneFamily, 'Keluarga Bapak Hendra');
    assert.strictEqual(adapted.partnerTwoFamily, 'Keluarga Bapak Surya');
    assert.strictEqual(adapted.intro, 'Teks pembuka...');
    assert.strictEqual(adapted.prayer, 'Teks doa...');
    assert.strictEqual(adapted.closing, 'Teks penutup...');
    assert.strictEqual(adapted.giftMessage, 'Pesan kado...');
    assert.strictEqual(adapted.timeZone, 'Asia/Makassar');
  });

  await t.test('fails closed on missing or empty partnerOneName', () => {
    assert.strictEqual(
      adaptVelvetLetterContent({ partnerTwoName: 'Arga', timeZone: 'Asia/Jakarta' }),
      null,
    );
    assert.strictEqual(
      adaptVelvetLetterContent({ partnerOneName: '   ', partnerTwoName: 'Arga', timeZone: 'Asia/Jakarta' }),
      null,
    );
  });

  await t.test('fails closed on missing or empty partnerTwoName', () => {
    assert.strictEqual(
      adaptVelvetLetterContent({ partnerOneName: 'Nadira', timeZone: 'Asia/Jakarta' }),
      null,
    );
    assert.strictEqual(
      adaptVelvetLetterContent({ partnerOneName: 'Nadira', partnerTwoName: '   ', timeZone: 'Asia/Jakarta' }),
      null,
    );
  });

  await t.test('fails closed on invalid timeZone', () => {
    assert.strictEqual(
      adaptVelvetLetterContent({
        partnerOneName: 'Nadira',
        partnerTwoName: 'Arga',
        timeZone: 'America/New_York',
      }),
      null,
    );
  });

  await t.test('defensively caps ceremonies at 2 and preserves valid fields', () => {
    const raw = {
      partnerOneName: 'Nadira',
      partnerTwoName: 'Arga',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-11-22T08:00',
          venue: 'Gedung Kesenian',
          mapsUrl: 'https://maps.google.com/?q=Test',
        },
        {
          title: 'Resepsi',
          startDateTime: '2026-11-22T11:00',
          venue: 'Grand Ballroom',
        },
        {
          title: 'After Party (Should be ignored)',
          startDateTime: '2026-11-22T19:00',
          venue: 'Lounge',
        },
      ],
    };

    const adapted = adaptVelvetLetterContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.ceremonies?.length, 2);
    assert.strictEqual(adapted.ceremonies?.[0].title, 'Akad Nikah');
    assert.strictEqual(adapted.ceremonies?.[1].title, 'Resepsi');
  });

  await t.test('defensively caps giftAccounts at 2 and preserves string accountNumber with leading zeroes', () => {
    const raw = {
      partnerOneName: 'Nadira',
      partnerTwoName: 'Arga',
      timeZone: 'Asia/Jakarta',
      giftAccounts: [
        { bankName: 'BCA', accountNumber: '00123456789', accountHolder: 'Nadira Putri' },
        { bankName: 'Mandiri', accountNumber: '00987654321', accountHolder: 'Arga Pratama' },
        { bankName: 'BNI', accountNumber: '00000000000', accountHolder: 'Third Account' },
      ],
    };

    const adapted = adaptVelvetLetterContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.giftAccounts?.length, 2);
    assert.strictEqual(typeof adapted.giftAccounts?.[0].accountNumber, 'string');
    assert.strictEqual(adapted.giftAccounts?.[0].accountNumber, '00123456789');
    assert.strictEqual(adapted.giftAccounts?.[1].accountNumber, '00987654321');
  });

  await t.test('does not synthesize Maps URL if mapsUrl is absent', () => {
    const raw = {
      partnerOneName: 'Nadira',
      partnerTwoName: 'Arga',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-11-22T08:00',
          venue: 'Gedung Kesenian',
        },
      ],
    };

    const adapted = adaptVelvetLetterContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.ceremonies?.[0].mapsUrl, undefined);
  });

  await t.test('media adapter filters approved PHOTO slots and ignores non-PHOTO', () => {
    const mediaList: PublicMediaDescriptor[] = [
      {
        id: 'photo-1',
        src: '/media/bride.jpg',
        type: 'PHOTO',
        slot: 'partner-one-photo',
        order: 0,
      },
      {
        id: 'video-1',
        src: '/media/fake.mp4',
        type: 'VIDEO',
        slot: 'partner-one-photo',
        order: 1,
      },
      {
        id: 'photo-2',
        src: '/media/groom.jpg',
        type: 'PHOTO',
        slot: 'partner-two-photo',
        order: 0,
      },
      {
        id: 'photo-3',
        src: '/media/extra.jpg',
        type: 'PHOTO',
        slot: 'gallery',
        order: 0,
      },
    ];

    const adapted = adaptVelvetLetterMedia(undefined, mediaList);
    assert.strictEqual(adapted.partnerOnePhoto?.id, 'photo-1');
    assert.strictEqual(adapted.partnerTwoPhoto?.id, 'photo-2');
  });
});
