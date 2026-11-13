import test from 'node:test';
import assert from 'node:assert';
import {
  formatLogTimestamp,
  getActionBadgeInfo,
} from './page';

test('Activity Logs UI Helpers', async (t) => {
  await t.test('formatLogTimestamp formats valid date', () => {
    const formatted = formatLogTimestamp('2026-11-13T10:00:00.000Z');
    assert.ok(formatted.includes('2026'));
    assert.ok(formatted.includes('13'));
  });

  await t.test('formatLogTimestamp handles invalid or empty date', () => {
    assert.strictEqual(formatLogTimestamp(''), '-');
    assert.strictEqual(formatLogTimestamp('invalid'), '-');
  });

  await t.test('getActionBadgeInfo returns friendly labels for actions', () => {
    assert.strictEqual(getActionBadgeInfo('AUTH_LOGIN_SUCCESS').label, 'Login Sukses');
    assert.strictEqual(getActionBadgeInfo('AUTH_LOGIN_FAILED').label, 'Login Gagal');
    assert.strictEqual(getActionBadgeInfo('ATTENDANCE_CHECK_IN').label, 'Check-In');
    assert.strictEqual(getActionBadgeInfo('ATTENDANCE_WALK_IN').label, 'Walk-In');
    assert.strictEqual(getActionBadgeInfo('ORDER_CREATE').label, 'Pesanan');
    assert.strictEqual(getActionBadgeInfo('GUEST_DELETE').label, 'Hapus / Batal');
    assert.strictEqual(getActionBadgeInfo('EVENT_UPDATE').label, 'Pembaruan');
  });
});

