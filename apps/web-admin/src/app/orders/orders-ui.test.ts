import test from 'node:test';
import assert from 'node:assert';
import {
  formatRupiah,
  formatSimpleDate,
  getExpiryStatus,
  getStatusBadgeStyle,
} from './page';

test('Orders UI helpers', async (t) => {
  await t.test('formatRupiah formats price into Indonesian Rupiah format', () => {
    const formatted = formatRupiah(199000);
    assert.ok(formatted.includes('199.000'));
  });

  await t.test('formatSimpleDate formats valid date string', () => {
    const formatted = formatSimpleDate('2026-12-25T10:00:00.000Z');
    assert.ok(formatted.includes('2026'));
    assert.ok(formatted.includes('25'));
  });

  await t.test('formatSimpleDate returns hyphen for null or invalid date', () => {
    assert.strictEqual(formatSimpleDate(null), '-');
    assert.strictEqual(formatSimpleDate('invalid-date'), '-');
  });

  await t.test('getExpiryStatus returns none when activeUntil is null', () => {
    const status = getExpiryStatus(null);
    assert.strictEqual(status.label, 'Belum diatur');
    assert.strictEqual(status.variant, 'none');
  });

  await t.test('getExpiryStatus returns expired when date has passed', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const status = getExpiryStatus(pastDate);
    assert.strictEqual(status.variant, 'expired');
    assert.strictEqual(status.label, 'Kedaluwarsa');
  });

  await t.test('getExpiryStatus returns warning when 1 to 7 days left', () => {
    const threeDaysLeft = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const status = getExpiryStatus(threeDaysLeft);
    assert.strictEqual(status.variant, 'warning');
    assert.ok(status.label.includes('Berakhir dlm'));
  });

  await t.test('getExpiryStatus returns active when more than 7 days left', () => {
    const thirtyDaysLeft = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const status = getExpiryStatus(thirtyDaysLeft);
    assert.strictEqual(status.variant, 'active');
    assert.ok(status.label.includes('Aktif'));
  });

  await t.test('getStatusBadgeStyle returns proper labels for each order status', () => {
    assert.strictEqual(getStatusBadgeStyle('PAID').label, 'Lunas');
    assert.strictEqual(getStatusBadgeStyle('LIVE').label, 'Live');
    assert.strictEqual(getStatusBadgeStyle('AWAITING_PAYMENT').label, 'Menunggu Bayar');
    assert.strictEqual(getStatusBadgeStyle('CANCELLED').label, 'Dibatalkan');
    assert.strictEqual(getStatusBadgeStyle('DRAFT').label, 'Draf');
  });
});
