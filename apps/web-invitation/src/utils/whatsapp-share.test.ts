import test from 'node:test';
import assert from 'node:assert';
import {
  normalizeWhatsAppPhone,
  buildWhatsAppShareUrl,
  generateGuestsCsv,
  generateSpintaxMessage,
  buildAutoSenderWhatsAppUrl,
} from './whatsapp-share';

test('WhatsApp Share Utilities', async (t) => {
  await t.test('normalizeWhatsAppPhone normalizes Indonesian local format 0812... to 62812...', () => {
    assert.strictEqual(normalizeWhatsAppPhone('081234567890'), '6281234567890');
    assert.strictEqual(normalizeWhatsAppPhone('0812-3456-7890'), '6281234567890');
    assert.strictEqual(normalizeWhatsAppPhone('+62 812-3456-7890'), '6281234567890');
  });

  await t.test('normalizeWhatsAppPhone returns empty string when phone is empty or null', () => {
    assert.strictEqual(normalizeWhatsAppPhone(''), '');
    assert.strictEqual(normalizeWhatsAppPhone(null), '');
    assert.strictEqual(normalizeWhatsAppPhone(undefined), '');
  });

  await t.test('normalizeWhatsAppPhone preserves existing country code if starting without 0', () => {
    assert.strictEqual(normalizeWhatsAppPhone('628123456789'), '628123456789');
    assert.strictEqual(normalizeWhatsAppPhone('14155552671'), '14155552671');
  });

  await t.test('buildWhatsAppShareUrl builds wa.me URL with default invitation text when custom greeting is omitted', () => {
    const url = buildWhatsAppShareUrl(
      'Budi Santoso',
      'Pernikahan Romeo & Juliet',
      'https://irvite-id.vercel.app/i/code-123',
      '081234567890',
    );

    assert.ok(url.includes('https://wa.me/6281234567890?text='));
    assert.ok(url.includes(encodeURIComponent('Budi Santoso')));
    assert.ok(url.includes(encodeURIComponent('Pernikahan Romeo & Juliet')));
    assert.ok(url.includes(encodeURIComponent('https://irvite-id.vercel.app/i/code-123')));
  });

  await t.test('buildWhatsAppShareUrl uses custom greeting when provided', () => {
    const url = buildWhatsAppShareUrl(
      'Siti',
      'Acara Wedding',
      'https://irvite-id.vercel.app/i/code-abc',
      '081999888777',
      'Mohon kehadiran teman-teman sekalian di hari bahagia kami.',
    );

    assert.ok(url.includes('https://wa.me/6281999888777?text='));
    assert.ok(
      url.includes(
        encodeURIComponent('Mohon kehadiran teman-teman sekalian di hari bahagia kami.'),
      ),
    );
  });

  await t.test('buildWhatsAppShareUrl handles empty phone gracefully by leaving recipient blank for WhatsApp picker', () => {
    const url = buildWhatsAppShareUrl(
      'Andi',
      'Acara Wedding',
      'https://irvite-id.vercel.app/i/code-xyz',
      null,
    );

    assert.ok(url.startsWith('https://wa.me/?text='));
  });

  await t.test('generateGuestsCsv generates valid UTF-8 BOM CSV formatted string', () => {
    const csv = generateGuestsCsv([
      {
        name: 'Budi Santoso, S.Kom',
        category: 'VIP',
        phoneNumber: '08123456789',
        tableNumber: 'A1',
        maxPax: 2,
        isWaSent: true,
        rsvpStatus: 'Hadir',
        rsvpPax: 2,
        invitationUrl: 'https://irvite-id.vercel.app/i/budi-code',
      },
    ]);

    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes('"Nama Tamu"'));
    assert.ok(csv.includes('"Budi Santoso, S.Kom"'));
    assert.ok(csv.includes('"Sudah Terkirim"'));
    assert.ok(csv.includes('"Hadir"'));
  });

  await t.test('generateSpintaxMessage provides distinct variations across rotation index', () => {
    const v0 = generateSpintaxMessage('Anisa', 'Wedding Anisa & Faisal', 'https://irvite.id/i/1', 0);
    const v1 = generateSpintaxMessage('Anisa', 'Wedding Anisa & Faisal', 'https://irvite.id/i/1', 1);
    const v2 = generateSpintaxMessage('Anisa', 'Wedding Anisa & Faisal', 'https://irvite.id/i/1', 2);
    const v3 = generateSpintaxMessage('Anisa', 'Wedding Anisa & Faisal', 'https://irvite.id/i/1', 3);

    assert.ok(v0.includes('Kepada Yth.'));
    assert.ok(v1.includes('Salam hangat'));
    assert.ok(v2.includes('& Keluarga'));
    assert.ok(v3.includes('Yth. Anisa'));
    assert.notStrictEqual(v0, v1);
    assert.notStrictEqual(v1, v2);
  });

  await t.test('buildAutoSenderWhatsAppUrl builds direct web.whatsapp.com URL with spintax', () => {
    const autoUrl = buildAutoSenderWhatsAppUrl(
      'Hendra',
      'Syukuran Khitanan',
      'https://irvite.id/i/hendra',
      '081234567890',
      1,
    );

    assert.ok(autoUrl.startsWith('https://web.whatsapp.com/send?phone=6281234567890&text='));
    assert.ok(autoUrl.includes(encodeURIComponent('Salam hangat')));
    assert.ok(autoUrl.includes(encodeURIComponent('https://irvite.id/i/hendra')));
  });
});
