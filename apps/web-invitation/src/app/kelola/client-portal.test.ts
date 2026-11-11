import test from 'node:test';
import assert from 'node:assert';
import {
  buildWhatsAppShareUrl,
  buildPublicCustomInvitationUrl,
  buildPublicGroupWhatsAppShareUrl,
  generatePublicBroadcastMessage,
  generateGuestsCsv,
  normalizeWhatsAppPhone,
} from '../../utils/whatsapp-share';

test('Client Portal Contract Tests', async (t) => {
  await t.test('phone normalizer handles international and local Indonesian formats', () => {
    assert.strictEqual(normalizeWhatsAppPhone('085712345678'), '6285712345678');
    assert.strictEqual(normalizeWhatsAppPhone('+62 857-1234-5678'), '6285712345678');
    assert.strictEqual(normalizeWhatsAppPhone('6285712345678'), '6285712345678');
    assert.strictEqual(normalizeWhatsAppPhone(''), '');
  });

  await t.test('WhatsApp share link contains guest name, title, and unique invitation URL', () => {
    const guestName = 'Dian Sastrowardoyo';
    const eventTitle = 'The Royal Wedding of Romeo & Juliet';
    const invitationUrl = 'https://irvite-id.vercel.app/i/uniq-code-abc';
    const phone = '081234567890';

    const url = buildWhatsAppShareUrl(guestName, eventTitle, invitationUrl, phone);
    assert.ok(url.startsWith('https://wa.me/6281234567890?text='));
    assert.ok(url.includes(encodeURIComponent(guestName)));
    assert.ok(url.includes(encodeURIComponent(eventTitle)));
    assert.ok(url.includes(encodeURIComponent(invitationUrl)));
  });

  await t.test('WhatsApp share link incorporates custom personalized greetings if provided', () => {
    const guestName = 'Pak RT Sudirman';
    const eventTitle = 'Pernikahan Akbar';
    const invitationUrl = 'https://irvite-id.vercel.app/i/code-rt';
    const phone = '081399998888';
    const greeting = 'Besar harapan kami Bapak sekeluarga dapat hadir.';

    const url = buildWhatsAppShareUrl(guestName, eventTitle, invitationUrl, phone, greeting);
    assert.ok(url.includes(encodeURIComponent(greeting)));
    assert.ok(url.includes(encodeURIComponent(guestName)));
  });

  await t.test('CSV exporter exports headers and rows correctly with UTF-8 BOM', () => {
    const guests = [
      {
        name: 'Vina Maharani',
        category: 'REGULAR',
        phoneNumber: '081234567812',
        tableNumber: 'T-1',
        maxPax: 1,
        isWaSent: false,
        rsvpStatus: 'Belum Respon',
        rsvpPax: null,
        invitationUrl: 'https://irvite-id.vercel.app/i/vina-123',
      },
      {
        name: 'Dimas Saputra',
        category: 'VIP',
        phoneNumber: '081234567807',
        tableNumber: 'VIP-A',
        maxPax: 2,
        isWaSent: true,
        rsvpStatus: 'Hadir',
        rsvpPax: 2,
        invitationUrl: 'https://irvite-id.vercel.app/i/dimas-456',
      },
    ];

    const csv = generateGuestsCsv(guests);
    assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM for Excel compatibility');
    assert.ok(csv.includes('"Vina Maharani"'));
    assert.ok(csv.includes('"Dimas Saputra"'));
    assert.ok(csv.includes('"Belum Terkirim"'));
    assert.ok(csv.includes('"Sudah Terkirim"'));
    assert.ok(csv.includes('"VIP"'));
  });

  await t.test('Public custom invitation URL and group WA share URL format recipient properly', () => {
    const base = 'https://irvite.id/e/amila-raiswa-59da78';
    assert.strictEqual(buildPublicCustomInvitationUrl(base, ''), base);
    assert.strictEqual(
      buildPublicCustomInvitationUrl(base, 'Grup Alumni SMA 8'),
      'https://irvite.id/e/amila-raiswa-59da78?to=Grup%20Alumni%20SMA%208',
    );

    const waGroupUrl = buildPublicGroupWhatsAppShareUrl(
      'Followers & Sahabat Online',
      'Pernikahan Amila & Raiswa',
      base,
    );
    assert.ok(waGroupUrl.startsWith('https://wa.me/?text='));
    assert.ok(waGroupUrl.includes(encodeURIComponent('Followers & Sahabat Online')));
    assert.ok(waGroupUrl.includes(encodeURIComponent('to=Followers%20%26%20Sahabat%20Online')));

    const casualMsg = generatePublicBroadcastMessage(
      'Grup Alumni SMAN 8',
      'Pernikahan Amila & Raiswa',
      base,
      'casual',
    );
    assert.ok(casualMsg.includes('Halo teman-teman Grup Alumni SMAN 8!'));
    assert.ok(casualMsg.includes('?to=Grup%20Alumni%20SMAN%208'));

    const islamicMsg = generatePublicBroadcastMessage(
      'Keluarga Besar Surabaya',
      'Pernikahan Amila & Raiswa',
      base,
      'islamic',
    );
    assert.ok(islamicMsg.includes("Assalamu'alaikum"));

    const customWaUrl = buildPublicGroupWhatsAppShareUrl(
      'Grup Kantor',
      'Pernikahan Amila & Raiswa',
      base,
      'formal',
      'Pesan custom manual https://irvite.id/e/amila-raiswa-59da78?to=Grup%20Kantor',
    );
    assert.ok(customWaUrl.includes(encodeURIComponent('Pesan custom manual')));
  });
});

