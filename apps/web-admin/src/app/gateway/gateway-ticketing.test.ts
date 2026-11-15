import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  checkInLocalTicket,
  checkoutLocalOrder,
  correctLocalOrderEmail,
  createLocalPublicEvent,
  getLocalTicketingSummary,
  listLocalEvents,
  PLATFORM_FEE_PER_TICKET,
} from '../../lib/ticketing-store';

test('Ticketing store lists public events and enforces flat Rp 3.000 platform fee', () => {
  const catalog = listLocalEvents();
  assert.equal(catalog.platformFeePerTicket, 3000);
  assert.equal(PLATFORM_FEE_PER_TICKET, 3000);
  assert.ok(catalog.items.length >= 4);

  const concerts = listLocalEvents({ category: 'Konser Musik' });
  assert.equal(concerts.items.length, 1);
  assert.equal(concerts.items[0].slug, 'jakarta-indie-soundwave-2026');
});

test('Multi-tier checkout issues QR E-Tickets and calculates flat service fee', () => {
  const res = checkoutLocalOrder({
    eventSlug: 'jakarta-indie-soundwave-2026',
    tierId: 'tier-01-reguler',
    quantity: 2,
    buyerName: 'Dimas Anggara',
    buyerEmail: 'dimas@gmial.com',
    buyerWhatsapp: '081299887766',
    paymentMethod: 'QRIS Instan',
  });

  assert.equal(res.order.quantity, 2);
  assert.equal(res.order.subtotalAmount, 350000);
  assert.equal(res.order.serviceFeeAmount, 6000);
  assert.equal(res.order.totalAmount, 356000);
  assert.equal(res.order.tickets.length, 2);

  // 5-second CS typo email correction
  const corrected = correctLocalOrderEmail({
    lookupCode: res.order.orderCode,
    newEmail: 'dimas.anggara@gmail.com',
    correctedBy: 'Unit Test CS',
  });
  assert.equal(corrected.status, 'RESENT_SUCCESS');
  assert.equal(corrected.previousEmail, 'dimas@gmial.com');
  assert.equal(corrected.updatedEmail, 'dimas.anggara@gmail.com');

  // Gate Scanner check-in & anti-passback protection
  const firstTicketCode = res.order.tickets[0].ticketCode;
  const firstScan = checkInLocalTicket({
    ticketCode: firstTicketCode,
    gateName: 'Gate VIP Utama',
  });
  assert.equal(firstScan.valid, true);
  assert.equal(firstScan.alreadyCheckedIn, false);

  const duplicateScan = checkInLocalTicket({
    ticketCode: firstTicketCode,
    gateName: 'Gate VIP Utama',
  });
  assert.equal(duplicateScan.valid, false);
  assert.equal(duplicateScan.alreadyCheckedIn, true);
});

test('Creating a public event adds it to catalog and updates dashboard summary', () => {
  const created = createLocalPublicEvent({
    title: 'BANDUNG TECH & DESIGN SUMMIT 2026',
    category: 'Seminar & Edukasi',
    organizerName: 'IRVITE Studio',
    eventDate: '14 Nov 2026',
    eventTime: '09:00 - 16:00 WIB',
    venueName: 'Trans Luxury Convention Center',
    city: 'Bandung',
    tierName: 'Early Bird Pass',
    tierPrice: 120000,
    tierQuota: 200,
  });

  assert.equal(created.title, 'BANDUNG TECH & DESIGN SUMMIT 2026');
  const summary = getLocalTicketingSummary();
  assert.ok(summary.totalPublicEvents >= 5);
  assert.ok(summary.totalTicketsSold > 0);
});

test('Gateway and Ticketing pages enforce Soft Sage (#edf4f0), transparent PNG logo, web-invitation link, and zero emojis', () => {
  const gatewayFile = path.resolve(__dirname, 'page.tsx');
  const tiketFile = path.resolve(__dirname, '../tiket/page.tsx');

  const gatewaySource = fs.readFileSync(gatewayFile, 'utf8');
  const tiketSource = fs.readFileSync(tiketFile, 'utf8');

  // Verify Soft Sage background & PNG logo
  assert.match(gatewaySource, /#edf4f0/);
  assert.match(gatewaySource, /\/irvite-logo\.png/);
  assert.match(gatewaySource, /Selamat Datang di IRVITE/);

  // Verify 4 menu cards & untouched web-invitation connection
  assert.match(gatewaySource, /Beli Tiket/);
  assert.match(gatewaySource, /Undangan Pernikahan/);
  assert.match(gatewaySource, /Partnership/);
  assert.match(gatewaySource, /Customer Services/);
  assert.match(gatewaySource, /NEXT_PUBLIC_INVITATION_ORIGIN/);

  // Verify zero Unicode emojis in Gateway and Tiket pages
  const emojiRegex = /\p{Extended_Pictographic}/u;
  assert.equal(emojiRegex.test(gatewaySource), false, 'Gateway page must not contain emojis');
  assert.equal(emojiRegex.test(tiketSource), false, 'Tiket page must not contain emojis');
});
