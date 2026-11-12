import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCeremonyDate,
  parseCalendarDates,
  formatUtcDateCompact,
  buildGoogleCalendarUrl,
  buildIcsContent,
} from './calendar';

test('Calendar Utilities Contract Tests', async (t) => {
  await t.test('parseCeremonyDate correctly parses ISO strings with timezone offset', () => {
    const d = parseCeremonyDate('2027-06-20T08:00:00+07:00');
    assert.equal(d.getUTCFullYear(), 2027);
    assert.equal(d.getUTCMonth(), 5); // 0-indexed, 5 = June
    assert.equal(d.getUTCDate(), 20);
    assert.equal(d.getUTCHours(), 1); // 08:00 +07:00 = 01:00 UTC
    assert.equal(d.getUTCMinutes(), 0);
  });

  await t.test('parseCeremonyDate handles strings without timezone using target timeZone offset', () => {
    const dJakarta = parseCeremonyDate('2027-06-20T08:00', 'Asia/Jakarta');
    assert.equal(dJakarta.getUTCHours(), 1); // +07:00

    const dMakassar = parseCeremonyDate('2027-06-20T08:00', 'Asia/Makassar');
    assert.equal(dMakassar.getUTCHours(), 0); // +08:00

    const dJayapura = parseCeremonyDate('2027-06-20T08:00', 'Asia/Jayapura');
    assert.equal(dJayapura.getUTCHours(), 23); // 08:00 - 9h = 23:00 previous day
    assert.equal(dJayapura.getUTCDate(), 19);
  });

  await t.test('parseCeremonyDate handles date-only string YYYY-MM-DD gracefully', () => {
    const d = parseCeremonyDate('2027-06-20', 'Asia/Jakarta');
    assert.equal(d.getUTCFullYear(), 2027);
    assert.equal(d.getUTCMonth(), 5);
    assert.equal(d.getUTCDate(), 20);
    assert.equal(d.getUTCHours(), 1); // 08:00 WIB = 01:00 UTC
  });

  await t.test('parseCalendarDates falls back to 2 hours after start when end is missing or invalid', () => {
    const { start, end } = parseCalendarDates('2027-06-20T08:00:00+07:00');
    assert.equal(end.getTime() - start.getTime(), 2 * 60 * 60 * 1000); // 2 hours in ms

    // When end date is earlier than start date
    const { end: invalidEnd } = parseCalendarDates(
      '2027-06-20T10:00:00+07:00',
      '2027-06-20T07:00:00+07:00',
    );
    assert.equal(invalidEnd.getTime() - start.getTime() > 0, true);
  });

  await t.test('formatUtcDateCompact outputs standard format YYYYMMDDTHHmmssZ', () => {
    const d = new Date(Date.UTC(2027, 5, 20, 1, 30, 45));
    const compact = formatUtcDateCompact(d);
    assert.equal(compact, '20270620T013045Z');
  });

  await t.test('buildGoogleCalendarUrl builds valid URL with all encoded params', () => {
    const url = buildGoogleCalendarUrl({
      title: 'Akad Nikah - Citra & Galih',
      startDateTime: '2027-02-14T08:00:00+07:00',
      endDateTime: '2027-02-14T10:00:00+07:00',
      venue: 'Gedung Pernikahan Agung',
      address: 'Jl. Sudirman No. 1, Jakarta',
      description: 'Mohon doa restu untuk pernikahan kami.',
      url: 'https://irvite.id/i/galih-citra',
    });

    assert.equal(url.startsWith('https://calendar.google.com/calendar/render?'), true);

    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('action'), 'TEMPLATE');
    assert.equal(parsed.searchParams.get('text'), 'Akad Nikah - Citra & Galih');
    assert.equal(parsed.searchParams.get('dates'), '20270214T010000Z/20270214T030000Z');
    assert.equal(
      parsed.searchParams.get('location'),
      'Gedung Pernikahan Agung, Jl. Sudirman No. 1, Jakarta',
    );
    assert.equal(
      parsed.searchParams.get('details')?.includes('Mohon doa restu untuk pernikahan kami.'),
      true,
    );
    assert.equal(
      parsed.searchParams.get('details')?.includes('Link Undangan: https://irvite.id/i/galih-citra'),
      true,
    );
  });

  await t.test('buildIcsContent builds RFC 5545 compliant string', () => {
    const ics = buildIcsContent({
      title: 'Resepsi - Citra & Galih',
      startDateTime: '2027-02-14T11:00:00+07:00',
      endDateTime: '2027-02-14T14:00:00+07:00',
      venue: 'Grand Ballroom Hotel Mulia',
      address: 'Senayan, Jakarta',
      description: 'Kehadiran Anda merupakan kehormatan bagi kami.',
      url: 'https://irvite.id/i/galih-citra',
    });

    assert.equal(ics.startsWith('BEGIN:VCALENDAR'), true);
    assert.equal(ics.endsWith('END:VCALENDAR'), true);
    assert.equal(ics.includes('VERSION:2.0'), true);
    assert.equal(ics.includes('DTSTART:20270214T040000Z'), true);
    assert.equal(ics.includes('DTEND:20270214T070000Z'), true);
    assert.equal(ics.includes('SUMMARY:Resepsi - Citra & Galih'), true);
    assert.equal(ics.includes('LOCATION:Grand Ballroom Hotel Mulia\\, Senayan\\, Jakarta'), true);
    assert.equal(ics.includes('STATUS:CONFIRMED'), true);
  });
});
