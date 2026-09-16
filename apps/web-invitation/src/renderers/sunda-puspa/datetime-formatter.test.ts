import test from 'node:test';
import assert from 'node:assert';
import {
  parseEventLocalDateTime,
  formatCeremonyDate,
  formatCeremonyDateShort,
  formatCeremonyTime,
  formatCeremonyTimeRange,
  parseTargetEpoch,
  resolveTimeZoneLabel,
} from './datetime-formatter';

test('Sunda Puspa: Datetime Formatter Contract', async (t) => {
  await t.test('resolves Indonesian timezone labels', () => {
    assert.strictEqual(resolveTimeZoneLabel('Asia/Jakarta'), 'WIB');
    assert.strictEqual(resolveTimeZoneLabel('Asia/Makassar'), 'WITA');
    assert.strictEqual(resolveTimeZoneLabel('Asia/Jayapura'), 'WIT');
    assert.strictEqual(resolveTimeZoneLabel(null), 'WIB');
    assert.strictEqual(resolveTimeZoneLabel(''), 'WIB');
  });

  await t.test('parses ceremony datetime correctly without browser timezone drift', () => {
    const parsed = parseEventLocalDateTime('2026-12-20T08:30', 'Asia/Jakarta');
    assert.ok(parsed);
    assert.strictEqual(parsed.year, 2026);
    assert.strictEqual(parsed.month, 12);
    assert.strictEqual(parsed.day, 20);
    assert.strictEqual(parsed.hour, 8);
    assert.strictEqual(parsed.minute, 30);
    assert.strictEqual(parsed.timeZoneLabel, 'WIB');
    assert.strictEqual(parsed.formattedTime, '08:30 WIB');
    assert.strictEqual(parsed.formattedDate, 'Minggu, 20 Desember 2026');
    assert.strictEqual(parsed.formattedDateShort, '20 . 12 . 2026');
  });

  await t.test('formats ceremony time for WITA and WIT without shifting wall-clock hours', () => {
    const wita = formatCeremonyTime('2026-12-20T08:30', 'Asia/Makassar');
    assert.strictEqual(wita, '08:30 WITA');

    const wit = formatCeremonyTime('2026-12-20T08:30', 'Asia/Jayapura');
    assert.strictEqual(wit, '08:30 WIT');
  });

  await t.test('formats ceremony time range for start-only', () => {
    const range = formatCeremonyTimeRange('2026-12-20T08:00', null, 'Asia/Jakarta');
    assert.strictEqual(range, '08:00 WIB');
  });

  await t.test('formats ceremony time range for start and end on the same day', () => {
    const range = formatCeremonyTimeRange('2026-12-20T08:00', '2026-12-20T10:00', 'Asia/Jakarta');
    assert.strictEqual(range, '08:00 \u2013 10:00 WIB');

    const rangeMakassar = formatCeremonyTimeRange('2026-12-20T11:00', '2026-12-20T14:00', 'Asia/Makassar');
    assert.strictEqual(rangeMakassar, '11:00 \u2013 14:00 WITA');
  });

  await t.test('formats ceremony time range when start and end cross dates unambiguously', () => {
    const range = formatCeremonyTimeRange('2026-12-20T22:00', '2026-12-21T02:00', 'Asia/Jakarta');
    assert.strictEqual(
      range,
      'Minggu, 20 Desember 2026, 22:00 WIB \u2013 Senin, 21 Desember 2026, 02:00 WIB',
    );
  });

  await t.test('handles earlier-than-start endDateTime by treating it as unusable and rendering start time only', () => {
    const range = formatCeremonyTimeRange('2026-12-20T10:00', '2026-12-20T08:00', 'Asia/Jakarta');
    assert.strictEqual(range, '10:00 WIB');

    const rangeMakassar = formatCeremonyTimeRange('2026-12-20T14:00', '2026-12-20T11:00', 'Asia/Makassar');
    assert.strictEqual(rangeMakassar, '14:00 WITA');

    const rangeCrossDate = formatCeremonyTimeRange('2026-12-21T02:00', '2026-12-20T22:00', 'Asia/Jakarta');
    assert.strictEqual(rangeCrossDate, '02:00 WIB');
  });

  await t.test('derives correct absolute epoch milliseconds for countdown target', () => {
    // Jakarta is UTC+7
    const epochJakarta = parseTargetEpoch('2026-12-20T08:00', 'Asia/Jakarta');
    assert.ok(epochJakarta);
    assert.strictEqual(new Date(epochJakarta).toISOString(), '2026-12-20T01:00:00.000Z');

    // Makassar is UTC+8
    const epochMakassar = parseTargetEpoch('2026-12-20T08:00', 'Asia/Makassar');
    assert.ok(epochMakassar);
    assert.strictEqual(new Date(epochMakassar).toISOString(), '2026-12-20T00:00:00.000Z');

    // Jayapura is UTC+9
    const epochJayapura = parseTargetEpoch('2026-12-20T08:00', 'Asia/Jayapura');
    assert.ok(epochJayapura);
    assert.strictEqual(new Date(epochJayapura).toISOString(), '2026-12-19T23:00:00.000Z');
  });

  await t.test('returns null / empty defensively on invalid or missing input', () => {
    assert.strictEqual(parseEventLocalDateTime(null), null);
    assert.strictEqual(parseEventLocalDateTime('invalid'), null);
    assert.strictEqual(formatCeremonyDate('invalid'), '');
    assert.strictEqual(formatCeremonyDateShort('invalid'), '');
    assert.strictEqual(formatCeremonyTime('invalid'), '');
    assert.strictEqual(formatCeremonyTimeRange('invalid'), '');
    assert.strictEqual(parseTargetEpoch(null), null);
    assert.strictEqual(parseTargetEpoch('invalid'), null);
  });
});
