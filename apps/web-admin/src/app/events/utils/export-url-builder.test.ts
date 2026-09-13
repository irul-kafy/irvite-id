import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildExportUrl } from './export-url-builder';

describe('buildExportUrl', () => {
  const eventId = 'test-event-123';

  it('builds guest export XLSX with default format', () => {
    const url = buildExportUrl(eventId, 'guests', {});
    assert.strictEqual(url, '/api/events/test-event-123/guests/export?format=xlsx');
  });

  it('builds guest export CSV when specified', () => {
    const url = buildExportUrl(eventId, 'guests', { format: 'csv' });
    assert.strictEqual(url, '/api/events/test-event-123/guests/export?format=csv');
  });

  it('builds attendance report XLSX when specified', () => {
    const url = buildExportUrl(eventId, 'attendance', { format: 'xlsx' });
    assert.strictEqual(url, '/api/events/test-event-123/attendance/report?format=xlsx');
  });

  it('builds attendance report CSV when specified', () => {
    const url = buildExportUrl(eventId, 'attendance', { format: 'csv' });
    assert.strictEqual(url, '/api/events/test-event-123/attendance/report?format=csv');
  });

  it('correctly includes rsvp=yes, attendance=checked-in, and category=VIP', () => {
    const url = buildExportUrl(eventId, 'guests', {
      format: 'xlsx',
      rsvp: 'yes',
      attendance: 'checked-in',
      category: 'VIP',
    });

    assert.ok(url.includes('rsvp=yes'));
    assert.ok(url.includes('attendance=checked-in'));
    assert.ok(url.includes('category=VIP'));
    assert.strictEqual(
      url,
      '/api/events/test-event-123/guests/export?format=xlsx&rsvp=yes&attendance=checked-in&category=VIP',
    );
  });

  it('trims whitespace around category', () => {
    const url = buildExportUrl(eventId, 'guests', {
      category: '  VIP Keluarga  ',
    });
    const parsed = new URL(url, 'http://localhost');
    assert.strictEqual(parsed.searchParams.get('category'), 'VIP Keluarga');
  });

  it('omits category when empty or blank whitespace', () => {
    const urlEmpty = buildExportUrl(eventId, 'guests', {
      format: 'csv',
      category: '',
    });
    assert.ok(!urlEmpty.includes('category'));

    const urlWhitespace = buildExportUrl(eventId, 'attendance', {
      format: 'xlsx',
      category: '   ',
    });
    assert.ok(!urlWhitespace.includes('category'));
  });

  it('allows category of exactly 50 characters', () => {
    const exact50 = 'A'.repeat(50);
    const url = buildExportUrl(eventId, 'guests', {
      category: exact50,
    });
    const parsed = new URL(url, 'http://localhost');
    assert.strictEqual(parsed.searchParams.get('category'), exact50);
  });

  it('throws explicit Error when category exceeds 50 characters (never silently truncates)', () => {
    const overLength = 'A'.repeat(51);
    assert.throws(
      () => {
        buildExportUrl(eventId, 'guests', {
          category: overLength,
        });
      },
      {
        name: 'Error',
        message: 'Kategori maksimal 50 karakter.',
      },
    );
  });

  it('verifies all 4 export actions choose correct endpoint and format', () => {
    const filters = { rsvp: 'all' as const, attendance: 'all' as const };

    const guestXlsx = buildExportUrl(eventId, 'guests', { ...filters, format: 'xlsx' });
    assert.strictEqual(guestXlsx, '/api/events/test-event-123/guests/export?format=xlsx&rsvp=all&attendance=all');

    const guestCsv = buildExportUrl(eventId, 'guests', { ...filters, format: 'csv' });
    assert.strictEqual(guestCsv, '/api/events/test-event-123/guests/export?format=csv&rsvp=all&attendance=all');

    const attendanceXlsx = buildExportUrl(eventId, 'attendance', { ...filters, format: 'xlsx' });
    assert.strictEqual(attendanceXlsx, '/api/events/test-event-123/attendance/report?format=xlsx&rsvp=all&attendance=all');

    const attendanceCsv = buildExportUrl(eventId, 'attendance', { ...filters, format: 'csv' });
    assert.strictEqual(attendanceCsv, '/api/events/test-event-123/attendance/report?format=csv&rsvp=all&attendance=all');
  });
});
