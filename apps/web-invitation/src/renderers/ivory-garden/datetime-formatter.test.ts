import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseEventLocalDateTime,
  resolveTimeZoneLabel,
  formatCeremonyDate,
  formatCeremonyTime,
  parseTargetEpoch,
} from './datetime-formatter';

describe('Phase #8A: Datetime Formatter for Event-Local Time', () => {
  it('correctly maps time zones to Indonesian abbreviations', () => {
    assert.strictEqual(resolveTimeZoneLabel('Asia/Jakarta'), 'WIB');
    assert.strictEqual(resolveTimeZoneLabel('Asia/Makassar'), 'WITA');
    assert.strictEqual(resolveTimeZoneLabel('Asia/Jayapura'), 'WIT');
    assert.strictEqual(resolveTimeZoneLabel(null), 'WIB');
    assert.strictEqual(resolveTimeZoneLabel('Unknown/Zone'), 'WIB');
  });

  it('parses ceremony datetime with Asia/Jakarta as WIB without browser timezone shift', () => {
    const res = parseEventLocalDateTime('2026-12-20T10:00', 'Asia/Jakarta');
    assert.ok(res);
    assert.strictEqual(res.year, 2026);
    assert.strictEqual(res.month, 12);
    assert.strictEqual(res.day, 20);
    assert.strictEqual(res.hour, 10);
    assert.strictEqual(res.minute, 0);
    assert.strictEqual(res.timeZoneLabel, 'WIB');
    assert.strictEqual(res.formattedTime, '10:00 WIB');
    assert.strictEqual(res.formattedDate, 'Minggu, 20 Desember 2026');
    assert.strictEqual(res.fullFormatted, 'Minggu, 20 Desember 2026, 10:00 WIB');
  });

  it('parses ceremony datetime with Asia/Makassar as WITA without browser timezone shift', () => {
    const res = parseEventLocalDateTime('2026-12-20T10:00', 'Asia/Makassar');
    assert.ok(res);
    assert.strictEqual(res.hour, 10);
    assert.strictEqual(res.minute, 0);
    assert.strictEqual(res.timeZoneLabel, 'WITA');
    assert.strictEqual(res.formattedTime, '10:00 WITA');
  });

  it('parses ceremony datetime with Asia/Jayapura as WIT without browser timezone shift', () => {
    const res = parseEventLocalDateTime('2026-12-20T10:00', 'Asia/Jayapura');
    assert.ok(res);
    assert.strictEqual(res.hour, 10);
    assert.strictEqual(res.minute, 0);
    assert.strictEqual(res.timeZoneLabel, 'WIT');
    assert.strictEqual(res.formattedTime, '10:00 WIT');
  });

  it('correctly handles leap year date (2028-02-29T14:30)', () => {
    const res = parseEventLocalDateTime('2028-02-29T14:30', 'Asia/Jakarta');
    assert.ok(res);
    assert.strictEqual(res.year, 2028);
    assert.strictEqual(res.month, 2);
    assert.strictEqual(res.day, 29);
    assert.strictEqual(res.hour, 14);
    assert.strictEqual(res.minute, 30);
    assert.strictEqual(res.formattedDate, 'Selasa, 29 Februari 2028');
    assert.strictEqual(res.formattedTime, '14:30 WIB');
  });

  it('returns null for invalid or null inputs gracefully', () => {
    assert.strictEqual(parseEventLocalDateTime(null), null);
    assert.strictEqual(parseEventLocalDateTime(''), null);
    assert.strictEqual(parseEventLocalDateTime('invalid-date'), null);
    assert.strictEqual(parseEventLocalDateTime('2026-13-40T25:70'), null);
  });

  it('formats ceremony date and time cleanly using helper functions', () => {
    assert.strictEqual(
      formatCeremonyDate('2026-12-20T10:00', 'Asia/Jakarta'),
      'Minggu, 20 Desember 2026'
    );
    assert.strictEqual(
      formatCeremonyTime('2026-12-20T10:00', 'Asia/Jakarta'),
      '10:00 WIB'
    );
    assert.strictEqual(formatCeremonyDate(null), '');
    assert.strictEqual(formatCeremonyTime(null), '');
  });

  it('converts ceremony wall-clock time to exact UTC epoch instant for countdown', () => {
    // 2026-12-20T10:00 Asia/Jakarta (UTC+7) -> 2026-12-20T03:00:00Z
    const jakartaEpoch = parseTargetEpoch('2026-12-20T10:00', 'Asia/Jakarta');
    assert.ok(jakartaEpoch !== null);
    assert.strictEqual(jakartaEpoch, Date.parse('2026-12-20T03:00:00Z'));

    // 2026-12-20T10:00 Asia/Makassar (UTC+8) -> 2026-12-20T02:00:00Z
    const makassarEpoch = parseTargetEpoch('2026-12-20T10:00', 'Asia/Makassar');
    assert.ok(makassarEpoch !== null);
    assert.strictEqual(makassarEpoch, Date.parse('2026-12-20T02:00:00Z'));

    // 2026-12-20T10:00 Asia/Jayapura (UTC+9) -> 2026-12-20T01:00:00Z
    const jayapuraEpoch = parseTargetEpoch('2026-12-20T10:00', 'Asia/Jayapura');
    assert.ok(jayapuraEpoch !== null);
    assert.strictEqual(jayapuraEpoch, Date.parse('2026-12-20T01:00:00Z'));

    // Gracefully handles invalid / null dates
    assert.strictEqual(parseTargetEpoch(null), null);
    assert.strictEqual(parseTargetEpoch(''), null);
    assert.strictEqual(parseTargetEpoch('invalid-date'), null);
  });
});
