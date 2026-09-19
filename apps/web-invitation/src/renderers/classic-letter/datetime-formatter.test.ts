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

test('Classic Letter: Datetime Formatter Contract', async (t) => {
  await t.test('formatCeremonyDate, formatCeremonyDateShort, and formatCeremonyTime return formatted strings', () => {
    const dt = '2026-11-22T08:30';
    assert.strictEqual(formatCeremonyDate(dt, 'Asia/Jakarta'), 'Minggu, 22 November 2026');
    assert.strictEqual(formatCeremonyDateShort(dt, 'Asia/Jakarta'), '22 · 11 · 2026');
    assert.strictEqual(formatCeremonyTime(dt, 'Asia/Jakarta'), '08:30 WIB');
    assert.strictEqual(formatCeremonyDate(null), '');
    assert.strictEqual(formatCeremonyDateShort(null), '');
    assert.strictEqual(formatCeremonyTime(null), '');
  });

	  await t.test('resolves Indonesian timezone labels', () => {
    assert.strictEqual(resolveTimeZoneLabel('Asia/Jakarta'), 'WIB');
    assert.strictEqual(resolveTimeZoneLabel('Asia/Makassar'), 'WITA');
    assert.strictEqual(resolveTimeZoneLabel('Asia/Jayapura'), 'WIT');
    assert.strictEqual(resolveTimeZoneLabel(null), 'WIB');
    assert.strictEqual(resolveTimeZoneLabel(''), 'WIB');
  });

  await t.test('parses ceremony datetime correctly without browser timezone drift', () => {
    const parsed = parseEventLocalDateTime('2026-11-22T08:30', 'Asia/Jakarta');
    assert.ok(parsed);
    assert.strictEqual(parsed.year, 2026);
    assert.strictEqual(parsed.month, 11);
    assert.strictEqual(parsed.day, 22);
    assert.strictEqual(parsed.hour, 8);
    assert.strictEqual(parsed.minute, 30);
    assert.strictEqual(parsed.timeZoneLabel, 'WIB');
    assert.strictEqual(parsed.formattedTime, '08:30 WIB');
    assert.strictEqual(parsed.formattedDateShort, '22 \u00b7 11 \u00b7 2026');
    assert.strictEqual(parsed.dayStr, '22');
    assert.strictEqual(parsed.monthName, 'November');
    assert.strictEqual(parsed.yearStr, '2026');
    assert.strictEqual(parsed.dayOfWeek, 'Minggu');
  });

  await t.test('formats ceremony time: start only', () => {
    const time = formatCeremonyTimeRange('2026-11-22T09:00', null, 'Asia/Jakarta');
    assert.strictEqual(time, '09:00 WIB');
  });

  await t.test('formats ceremony time: start and end same day range', () => {
    const time = formatCeremonyTimeRange('2026-11-22T09:00', '2026-11-22T11:30', 'Asia/Jakarta');
    assert.strictEqual(time, '09:00 \u2013 11:30 WIB');
  });

  await t.test('formats ceremony time: start and end cross-date range', () => {
    const time = formatCeremonyTimeRange('2026-11-22T22:00', '2026-11-23T02:00', 'Asia/Jakarta');
    assert.ok(time.includes('Minggu, 22 November 2026, 22:00 WIB'));
    assert.ok(time.includes('Senin, 23 November 2026, 02:00 WIB'));
  });

  await t.test('formats ceremony time: end < start falls back to start time only', () => {
    const time = formatCeremonyTimeRange('2026-11-22T14:00', '2026-11-22T10:00', 'Asia/Jakarta');
    assert.strictEqual(time, '14:00 WIB');
  });

  await t.test('computes target epoch with explicit timezone offset', () => {
    const epochWib = parseTargetEpoch('2026-11-22T08:00', 'Asia/Jakarta');
    const epochWita = parseTargetEpoch('2026-11-22T08:00', 'Asia/Makassar');
    const epochWit = parseTargetEpoch('2026-11-22T08:00', 'Asia/Jayapura');

    assert.ok(epochWib);
    assert.ok(epochWita);
    assert.ok(epochWit);

    // 08:00 WIT (+09) is 1 hour earlier epoch than 08:00 WITA (+08), which is 1 hour earlier than 08:00 WIB (+07)
    assert.strictEqual(epochWib - epochWita, 3600000);
    assert.strictEqual(epochWita - epochWit, 3600000);
  });
});
