import test from 'node:test';
import assert from 'node:assert';
import { buildWhatsAppShareUrl, isLocalhostUrl } from './whatsapp-share';

test('buildWhatsAppShareUrl', async (t) => {
  await t.test('produces valid wa.me URL', () => {
    const url = buildWhatsAppShareUrl('John Doe', 'Pernikahan Agung', 'https://irvite.id/i/abc123');
    assert.ok(url.startsWith('https://wa.me/?text='));
  });

  await t.test('includes guest name in message', () => {
    const url = buildWhatsAppShareUrl('Ahmad Fauzi', 'Resepsi', 'https://irvite.id/i/xyz');
    const decoded = decodeURIComponent(url.replace('https://wa.me/?text=', ''));
    assert.ok(decoded.includes('Ahmad Fauzi'));
  });

  await t.test('includes event title in message', () => {
    const url = buildWhatsAppShareUrl('Sari', 'Pernikahan Indah & Budi', 'https://irvite.id/i/xyz');
    const decoded = decodeURIComponent(url.replace('https://wa.me/?text=', ''));
    assert.ok(decoded.includes('Pernikahan Indah & Budi'));
  });

  await t.test('includes canonical URL in message', () => {
    const canonical = 'https://irvite.id/i/abc-def_123';
    const url = buildWhatsAppShareUrl('Tamu', 'Acara', canonical);
    const decoded = decodeURIComponent(url.replace('https://wa.me/?text=', ''));
    assert.ok(decoded.includes(canonical));
  });

  await t.test('encodes special characters correctly', () => {
    const url = buildWhatsAppShareUrl('Dr. H. Muhammad & Istri', 'Walimatul Urs', 'https://irvite.id/i/abc');
    assert.ok(url.startsWith('https://wa.me/?text='));
    const textParam = url.substring('https://wa.me/?text='.length);
    assert.ok(!textParam.includes('&'));
    const decoded = decodeURIComponent(textParam);
    assert.ok(decoded.includes('Dr. H. Muhammad & Istri'));
  });

  await t.test('does not include raw database IDs or uniqueCode separately', () => {
    const url = buildWhatsAppShareUrl('Tamu', 'Acara', 'https://irvite.id/i/secret_code_123');
    const decoded = decodeURIComponent(url.replace('https://wa.me/?text=', ''));
    const withoutCanonical = decoded.replace('https://irvite.id/i/secret_code_123', '');
    assert.ok(!withoutCanonical.includes('secret_code_123'));
  });

  await t.test('includes professional closing', () => {
    const url = buildWhatsAppShareUrl('Tamu', 'Acara', 'https://irvite.id/i/xyz');
    const decoded = decodeURIComponent(url.replace('https://wa.me/?text=', ''));
    assert.ok(decoded.includes('Terima kasih.'));
  });
});

test('isLocalhostUrl', async (t) => {
  await t.test('localhost => true', () => {
    assert.strictEqual(isLocalhostUrl('http://localhost:3002/i/abc'), true);
    assert.strictEqual(isLocalhostUrl('http://localhost/i/abc'), true);
  });

  await t.test('127.0.0.1 => true', () => {
    assert.strictEqual(isLocalhostUrl('http://127.0.0.1:3002/i/abc'), true);
    assert.strictEqual(isLocalhostUrl('http://127.0.0.1/i/abc'), true);
  });

  await t.test('IPv6 ::1 form => true', () => {
    assert.strictEqual(isLocalhostUrl('http://[::1]:3002/i/abc'), true);
    assert.strictEqual(isLocalhostUrl('http://[::1]/i/abc'), true);
  });

  await t.test('production domain => false', () => {
    assert.strictEqual(isLocalhostUrl('https://irvite.id/i/abc'), false);
    assert.strictEqual(isLocalhostUrl('https://invitation.irvite.id/i/abc'), false);
  });

  await t.test('other external domains => false', () => {
    assert.strictEqual(isLocalhostUrl('https://example.com/i/abc'), false);
  });

  await t.test('invalid URL => false', () => {
    assert.strictEqual(isLocalhostUrl('not-a-url'), false);
    assert.strictEqual(isLocalhostUrl(''), false);
  });
});
