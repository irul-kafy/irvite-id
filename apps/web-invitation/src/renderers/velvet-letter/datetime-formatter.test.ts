import test from 'node:test';
import assert from 'node:assert';
import {
  parseEventLocalDateTime,
  formatCeremonyDate,
  formatCeremonyDateShort,
  formatCeremonyTime,
  formatCeremonyTimeRange,
  parseTargetEpoch,
} from './datetime-formatter';

test('Velvet Letter: Datetime Formatter', async (t) => {
  await t.test('parses event-local datetime components correctly', () => {
    const parsed = parseEventLocalDateTime('2026-11-22T08:00', 'Asia/Jakarta');
    assert.ok(parsed);
    assert.strictEqual(parsed.year, 2026);
    assert.strictEqual(parsed.month, 11);
    assert.strictEqual(parsed.day, 22);
  });

  await t.test('formats event-local date in WIB (Asia/Jakarta)', () => {
    const dt = '2026-11-22T08:00';
    const dateStr = formatCeremonyDate(dt, 'Asia/Jakarta');
    assert.strictEqual(dateStr, 'Minggu, 22 November 2026');

    const shortDate = formatCeremonyDateShort(dt, 'Asia/Jakarta');
    assert.strictEqual(shortDate, '22 . 11 . 2026');

    const timeStr = formatCeremonyTime(dt, 'Asia/Jakarta');
    assert.strictEqual(timeStr, '08:00 WIB');
  });

  await t.test('formats event-local date in WITA (Asia/Makassar)', () => {
    const dt = '2026-11-22T09:30';
    const timeStr = formatCeremonyTime(dt, 'Asia/Makassar');
    assert.strictEqual(timeStr, '09:30 WITA');
  });

  await t.test('formats event-local date in WIT (Asia/Jayapura)', () => {
    const dt = '2026-11-22T10:15';
    const timeStr = formatCeremonyTime(dt, 'Asia/Jayapura');
    assert.strictEqual(timeStr, '10:15 WIT');
  });

  await t.test('formats ceremony time range for same-day start and end', () => {
    const range = formatCeremonyTimeRange('2026-11-22T08:00', '2026-11-22T11:00', 'Asia/Jakarta');
    assert.strictEqual(range, '08:00 – 11:00 WIB');
  });

  await t.test('formats ceremony time range for cross-date start and end', () => {
    const range = formatCeremonyTimeRange('2026-11-22T22:00', '2026-11-23T02:00', 'Asia/Jakarta');
    assert.strictEqual(
      range,
      'Minggu, 22 November 2026, 22:00 WIB – Senin, 23 November 2026, 02:00 WIB',
    );
  });

  await t.test('renders start time only if endDateTime < startDateTime (invalid end)', () => {
    const range = formatCeremonyTimeRange('2026-11-22T14:00', '2026-11-22T10:00', 'Asia/Jakarta');
    assert.strictEqual(range, '14:00 WIB');
  });

  await t.test('renders start time only if endDateTime is invalid string', () => {
    const range = formatCeremonyTimeRange('2026-11-22T08:00', 'invalid-date', 'Asia/Jakarta');
    assert.strictEqual(range, '08:00 WIB');
  });

  await t.test('computes deterministic epoch millisecond timestamp without host browser shifting', () => {
    const epochWib = parseTargetEpoch('2026-11-22T08:00', 'Asia/Jakarta');
    const epochWita = parseTargetEpoch('2026-11-22T08:00', 'Asia/Makassar');
    const epochWit = parseTargetEpoch('2026-11-22T08:00', 'Asia/Jayapura');

    assert.ok(epochWib !== null);
    assert.ok(epochWita !== null);
    assert.ok(epochWit !== null);

    // WIT (+9) is 1 hour earlier epoch than WITA (+8), which is 1 hour earlier than WIB (+7)
    assert.strictEqual(epochWib - epochWita, 3600000);
    assert.strictEqual(epochWita - epochWit, 3600000);
  });
});
