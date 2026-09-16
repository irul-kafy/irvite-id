import test from 'node:test';
import assert from 'node:assert';
import {
  adaptSundaPuspaContent,
  adaptSundaPuspaMedia,
} from './sunda-puspa.adapter';
import type { PublicMediaDescriptor } from '../../types/public-invitation';

test('Sunda Puspa: Content & Media Adapters', async (t) => {
  await t.test('adapts valid SUNDA_PUSPA content and trims string fields', () => {
    const raw = {
      partnerOneName: '  Galih  ',
      partnerTwoName: '  Ratna  ',
      partnerOneFullName: 'Galih Purnama',
      partnerTwoFullName: 'Ratna Kusuma',
      partnerOneParents: 'Bapak Ahmad & Ibu Siti',
      partnerTwoParents: 'Bapak Rudi & Ibu Maya',
      coupleGreeting: 'Sampurasun',
      openingText: 'Maha Suci Allah...',
      prayerText: 'Dan di antara tanda-tanda-Nya...',
      prayerSource: 'QS. Ar-Rum: 21',
      closingText: 'Hatur nuhun...',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-12-20T08:00',
          endDateTime: '2026-12-20T10:00',
          venue: 'Bale Asri Sasana Budaya',
          address: 'Jl. Dipati Ukur No. 12, Bandung',
          mapsUrl: 'https://maps.google.com/?q=Bandung',
        },
      ],
      story: [
        {
          year: '2020',
          title: 'Awal Mula',
          text: 'Kami pertama kali bertemu di kampus.',
        },
      ],
      _schemaVersion: 1,
    };

    const adapted = adaptSundaPuspaContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.partnerOneName, 'Galih');
    assert.strictEqual(adapted.partnerTwoName, 'Ratna');
    assert.strictEqual(adapted.partnerOneFullName, 'Galih Purnama');
    assert.strictEqual(adapted.partnerTwoFullName, 'Ratna Kusuma');
    assert.strictEqual(adapted.partnerOneParents, 'Bapak Ahmad & Ibu Siti');
    assert.strictEqual(adapted.partnerTwoParents, 'Bapak Rudi & Ibu Maya');
    assert.strictEqual(adapted.coupleGreeting, 'Sampurasun');
    assert.strictEqual(adapted.openingText, 'Maha Suci Allah...');
    assert.strictEqual(adapted.prayerText, 'Dan di antara tanda-tanda-Nya...');
    assert.strictEqual(adapted.prayerSource, 'QS. Ar-Rum: 21');
    assert.strictEqual(adapted.closingText, 'Hatur nuhun...');
    assert.strictEqual(adapted.timeZone, 'Asia/Jakarta');
    assert.strictEqual(adapted.ceremonies?.length, 1);
    assert.strictEqual(adapted.ceremonies?.[0].title, 'Akad Nikah');
    assert.strictEqual(adapted.ceremonies?.[0].startDateTime, '2026-12-20T08:00');
    assert.strictEqual(adapted.ceremonies?.[0].endDateTime, '2026-12-20T10:00');
    assert.strictEqual(adapted.ceremonies?.[0].venue, 'Bale Asri Sasana Budaya');
    assert.strictEqual(adapted.story?.length, 1);
    assert.strictEqual(adapted.story?.[0].year, '2020');
    assert.strictEqual(adapted.story?.[0].title, 'Awal Mula');
    assert.strictEqual(adapted._schemaVersion, 1);
  });

  await t.test('bounds ceremonies to max 2 items', () => {
    const raw = {
      partnerOneName: 'Galih',
      partnerTwoName: 'Ratna',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        { title: '1', startDateTime: '2026-12-20T08:00', venue: 'V1' },
        { title: '2', startDateTime: '2026-12-20T11:00', venue: 'V2' },
        { title: '3', startDateTime: '2026-12-20T18:00', venue: 'V3' },
      ],
    };
    const adapted = adaptSundaPuspaContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.ceremonies?.length, 2);
    assert.strictEqual(adapted.ceremonies?.[0].title, '1');
    assert.strictEqual(adapted.ceremonies?.[1].title, '2');
  });

  await t.test('bounds story to max 5 items', () => {
    const raw = {
      partnerOneName: 'Galih',
      partnerTwoName: 'Ratna',
      timeZone: 'Asia/Jakarta',
      story: [
        { year: '2021', title: 'S1', text: 'T1' },
        { year: '2022', title: 'S2', text: 'T2' },
        { year: '2023', title: 'S3', text: 'T3' },
        { year: '2024', title: 'S4', text: 'T4' },
        { year: '2025', title: 'S5', text: 'T5' },
        { year: '2026', title: 'S6', text: 'T6' },
      ],
    };
    const adapted = adaptSundaPuspaContent(raw);
    assert.ok(adapted);
    assert.strictEqual(adapted.story?.length, 5);
    assert.strictEqual(adapted.story?.[0].title, 'S1');
    assert.strictEqual(adapted.story?.[4].title, 'S5');
  });

  await t.test('fails closed (returns null) for empty or non-object content', () => {
    assert.strictEqual(adaptSundaPuspaContent(null), null);
    assert.strictEqual(adaptSundaPuspaContent(undefined), null);
    assert.strictEqual(adaptSundaPuspaContent(''), null);
    assert.strictEqual(adaptSundaPuspaContent({}), null);
    assert.strictEqual(adaptSundaPuspaContent([]), null);
  });

  await t.test('fails closed when partnerOneName is missing', () => {
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerTwoName: 'Ratna',
        timeZone: 'Asia/Jakarta',
      }),
      null,
    );
  });

  await t.test('fails closed when partnerTwoName is missing', () => {
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        timeZone: 'Asia/Jakarta',
      }),
      null,
    );
  });

  await t.test('fails closed when partner names are empty or whitespace only', () => {
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: '',
        partnerTwoName: 'Ratna',
        timeZone: 'Asia/Jakarta',
      }),
      null,
    );
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: '   ',
        partnerTwoName: 'Ratna',
        timeZone: 'Asia/Jakarta',
      }),
      null,
    );
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        partnerTwoName: '',
        timeZone: 'Asia/Jakarta',
      }),
      null,
    );
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        partnerTwoName: '   ',
        timeZone: 'Asia/Jakarta',
      }),
      null,
    );
  });

  await t.test('fails closed when timeZone is invalid', () => {
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        partnerTwoName: 'Ratna',
        timeZone: 'Asia/Singapore',
      }),
      null,
    );
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        partnerTwoName: 'Ratna',
        timeZone: 'UTC',
      }),
      null,
    );
  });

  await t.test('fails closed when timeZone is missing or empty', () => {
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        partnerTwoName: 'Ratna',
      }),
      null,
    );
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        partnerTwoName: 'Ratna',
        timeZone: '',
      }),
      null,
    );
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        partnerTwoName: 'Ratna',
        timeZone: '   ',
      }),
      null,
    );
  });

  await t.test('fails closed when required fields are non-string types', () => {
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 123,
        partnerTwoName: 'Ratna',
        timeZone: 'Asia/Jakarta',
      }),
      null,
    );
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        partnerTwoName: { name: 'Ratna' },
        timeZone: 'Asia/Jakarta',
      }),
      null,
    );
    assert.strictEqual(
      adaptSundaPuspaContent({
        partnerOneName: 'Galih',
        partnerTwoName: 'Ratna',
        timeZone: 12345,
      }),
      null,
    );
  });

  await t.test('succeeds when valid required trio is provided', () => {
    const wib = adaptSundaPuspaContent({
      partnerOneName: 'Galih',
      partnerTwoName: 'Ratna',
      timeZone: 'Asia/Jakarta',
    });
    assert.ok(wib);
    assert.strictEqual(wib.partnerOneName, 'Galih');
    assert.strictEqual(wib.partnerTwoName, 'Ratna');
    assert.strictEqual(wib.timeZone, 'Asia/Jakarta');

    const wita = adaptSundaPuspaContent({
      partnerOneName: '  Galih  ',
      partnerTwoName: '  Ratna  ',
      timeZone: 'Asia/Makassar',
    });
    assert.ok(wita);
    assert.strictEqual(wita.partnerOneName, 'Galih');
    assert.strictEqual(wita.partnerTwoName, 'Ratna');
    assert.strictEqual(wita.timeZone, 'Asia/Makassar');

    const wit = adaptSundaPuspaContent({
      partnerOneName: 'Galih',
      partnerTwoName: 'Ratna',
      timeZone: 'Asia/Jayapura',
    });
    assert.ok(wit);
    assert.strictEqual(wit.timeZone, 'Asia/Jayapura');
  });

  await t.test('adapts media slots correctly (couple-photo, gallery max 2, bg-music)', () => {
    const mediaList: PublicMediaDescriptor[] = [
      { id: '1', slot: 'couple-photo', type: 'PHOTO', order: 1, src: '/media/couple.jpg' },
      { id: '2', slot: 'gallery', type: 'PHOTO', order: 2, src: '/media/gal1.jpg' },
      { id: '3', slot: 'gallery', type: 'PHOTO', order: 3, src: '/media/gal2.jpg' },
      { id: '4', slot: 'gallery', type: 'PHOTO', order: 4, src: '/media/gal3.jpg' },
      { id: '5', slot: 'bg-music', type: 'AUDIO', order: 5, src: '/media/suling.mp3' },
      { id: '6', slot: 'bg-music', type: 'PHOTO', order: 6, src: '/media/wrong-type.jpg' },
    ];

    const adapted = adaptSundaPuspaMedia(undefined, mediaList);
    assert.ok(adapted);
    assert.strictEqual(adapted.couplePhoto?.src, '/media/couple.jpg');
    assert.strictEqual(adapted.gallery.length, 2);
    assert.strictEqual(adapted.gallery[0].src, '/media/gal1.jpg');
    assert.strictEqual(adapted.gallery[1].src, '/media/gal2.jpg');
    assert.strictEqual(adapted.bgMusic?.src, '/media/suling.mp3');
  });

  await t.test('handles missing media slots gracefully without throwing', () => {
    const adapted = adaptSundaPuspaMedia({}, []);
    assert.ok(adapted);
    assert.strictEqual(adapted.couplePhoto, undefined);
    assert.strictEqual(adapted.gallery.length, 0);
    assert.strictEqual(adapted.bgMusic, undefined);
  });
});
