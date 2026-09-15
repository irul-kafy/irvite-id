/* eslint-disable @typescript-eslint/no-require-imports */
// Register CSS and next/font/google stubs before any component import so Node.js test runner doesn't throw
if (typeof require !== 'undefined' && require.extensions) {
  require.extensions['.css'] = (module) => {
    module.exports = {};
  };
}

try {
  const fontStub = () => ({ className: 'mock-font' });
  const googleFonts = require('next/font/google');
  googleFonts.Inter = fontStub;
  googleFonts.Playfair_Display = fontStub;
  googleFonts.Lora = fontStub;
  googleFonts.Montserrat = fontStub;
} catch {
  // Gracefully ignored if next/font/google is already stubbed or unavailable
}

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RendererProps } from '../registry';

let SereneGarden: React.ComponentType<RendererProps>;

function renderSerene(props: Partial<RendererProps> & { data: RendererProps['data'] }): string {
  const el = React.createElement(SereneGarden, {
    mode: 'PUBLIC',
    ...props,
  });
  return renderToStaticMarkup(el);
}

describe('Phase #9B: Serene Garden Visual Integration Tests', () => {
  before(async () => {
    const mod = await import('./serene-garden');
    SereneGarden = (mod.default as unknown as { default: React.ComponentType<RendererProps> }).default || mod.default;
  });

  const baseEvent = {
    title: 'Alya & Raka',
    description: 'Pernikahan Alya & Raka',
    eventDate: '2026-12-20T08:00',
    locationDetails: 'Jakarta',
  };

  const fullContent = {
    partnerOneName: 'Alya',
    partnerTwoName: 'Raka',
    partnerOneFullName: 'Alya Putri Wijaya',
    partnerTwoFullName: 'Raka Pratama Nugraha',
    partnerOneParents: 'Putri pertama Bapak Wijaya & Ibu Siti',
    partnerTwoParents: 'Putra kedua Bapak Nugraha & Ibu Dewi',
    openingText: 'Dengan memohon rahmat dan ridho Allah SWT...',
    prayerText: 'Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu...',
    closingText: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami sekeluarga...',
    timeZone: 'Asia/Jakarta',
    ceremonies: [
      {
        title: 'Akad Nikah',
        startDateTime: '2026-12-20T08:00',
        endDateTime: '2026-12-20T10:00',
        venue: 'Masjid Raya Al-Ikhlas',
        address: 'Jl. Merdeka No. 45, Jakarta Selatan',
        mapsUrl: 'https://maps.app.goo.gl/abc123xyz',
      },
      {
        title: 'Resepsi Pernikahan',
        startDateTime: '2026-12-20T11:00',
        endDateTime: '2026-12-20T14:00',
        venue: 'Grand Ballroom Hotel Sentral',
        address: 'Jl. Sudirman Kav. 1, Jakarta Pusat',
      },
    ],
    giftTitle: 'Tanda Kasih',
    giftMessage: 'Doa restu Anda merupakan karunia terindah bagi kami.',
    giftAccounts: [
      {
        bankName: 'BCA',
        accountNumber: '001234567890',
        accountHolderName: 'Alya Putri Wijaya',
      },
    ],
  };

  const mediaWithPhotos = {
    'partner-one-photo': [
      { id: 'm1', slot: 'partner-one-photo', type: 'PHOTO' as const, order: 1, src: '/media/alya.jpg' },
    ],
    'partner-two-photo': [
      { id: 'm2', slot: 'partner-two-photo', type: 'PHOTO' as const, order: 2, src: '/media/raka.jpg' },
    ],
  };

  it('renders short names on cover, monogram, and closing, and formal full names in couple profiles', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
        mediaBySlot: mediaWithPhotos,
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('Alya'));
    assert.ok(html.includes('Raka'));
    assert.ok(html.includes('Alya Putri Wijaya'));
    assert.ok(html.includes('Raka Pratama Nugraha'));
    assert.ok(html.includes('Putri pertama Bapak Wijaya &amp; Ibu Siti'));
    assert.ok(html.includes('Putra kedua Bapak Nugraha &amp; Ibu Dewi'));
  });

  it('falls back to short names when partnerOneFullName / partnerTwoFullName are omitted', () => {
    const contentWithoutFullNames = {
      ...fullContent,
      partnerOneFullName: undefined,
      partnerTwoFullName: undefined,
    };

    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: contentWithoutFullNames },
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('<h3>Alya</h3>'));
    assert.ok(html.includes('<h3>Raka</h3>'));
  });

  it('strictly collapses and omits prose when optional fields are empty', () => {
    const minimalContent = {
      partnerOneName: 'Alya',
      partnerTwoName: 'Raka',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-12-20T08:00',
          venue: 'Masjid Raya',
        },
      ],
    };

    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: minimalContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('Dengan memohon rahmat dan ridho Allah SWT...'));
    assert.ok(!html.includes('Merupakan suatu kehormatan'));
    assert.ok(!html.includes('Putri pertama'));
    assert.ok(!html.includes('<blockquote>'));
  });

  it('renders ceremonies with time range, venue, address, and maps link', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('Akad Nikah'));
    assert.ok(html.includes('08:00 – 10:00 WIB'));
    assert.ok(html.includes('Masjid Raya Al-Ikhlas'));
    assert.ok(html.includes('Jl. Merdeka No. 45, Jakarta Selatan'));
    assert.ok(html.includes('href="https://maps.app.goo.gl/abc123xyz"'));
    assert.ok(html.includes('target="_blank"'));
    assert.ok(html.includes('rel="noopener noreferrer"'));
    assert.ok(html.includes('Resepsi Pernikahan'));
    assert.ok(html.includes('11:00 – 14:00 WIB'));
    assert.ok(html.includes('Grand Ballroom Hotel Sentral'));
  });

  it('renders start-only ceremony correctly without showing broken range', () => {
    const startOnlyContent = {
      ...fullContent,
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-12-20T09:00',
          venue: 'Masjid Raya',
        },
      ],
    };

    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: startOnlyContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('09:00 WIB'));
    assert.ok(!html.includes('09:00 – '));
  });

  it('renders partner photos when provided, and collapses portrait frame when absent', () => {
    const htmlWithPhotos = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
        mediaBySlot: mediaWithPhotos,
      },
      mode: 'PUBLIC',
    });
    assert.ok(htmlWithPhotos.includes('id="bride-portrait"'));
    assert.ok(htmlWithPhotos.includes('id="groom-portrait"'));
    assert.ok(htmlWithPhotos.includes('src="/media/alya.jpg"'));
    assert.ok(htmlWithPhotos.includes('src="/media/raka.jpg"'));

    const htmlNoPhotos = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
        mediaBySlot: {},
      },
      mode: 'PUBLIC',
    });
    assert.ok(!htmlNoPhotos.includes('id="bride-portrait"'));
    assert.ok(!htmlNoPhotos.includes('id="groom-portrait"'));
    assert.ok(!htmlNoPhotos.includes('<img'));
  });

  it('preserves bank account number as exact string with leading zero (001234567890)', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('001234567890'));
    assert.ok(html.includes('BCA'));
    assert.ok(html.includes('Alya Putri Wijaya'));
  });

  it('strictly excludes QRIS, giftQr, payment QR images, or payment links', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('QRIS'));
    assert.ok(!html.includes('giftQr'));
    assert.ok(!html.includes('gift-qr'));
    assert.ok(!html.includes('qris'));
    assert.ok(!html.includes('midtrans'));
    assert.ok(!html.includes('payment'));
  });

  it('strictly adds 0 QR codes in Serene renderer in both PUBLIC and PERSONALIZED modes', () => {
    const htmlPublic = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });
    assert.ok(!htmlPublic.includes('canvas'));
    assert.ok(!htmlPublic.includes('QRCode'));
    assert.ok(!htmlPublic.includes('qrImage'));

    const htmlPersonal = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Budi Santoso', customGreeting: null, maxPax: 2 },
        invitation: { customMessage: null },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      uniqueCode: 'abc123xyz',
      mode: 'PERSONAL',
    });
    assert.ok(!htmlPersonal.includes('canvas'));
    assert.ok(!htmlPersonal.includes('QRCode'));
  });

  it('PUBLIC mode: strictly omits guest name on cover, and RSVP section', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Budi Santoso', customGreeting: null, maxPax: 2 },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('Budi Santoso'));
    assert.ok(html.includes('Tamu Undangan'));
    assert.ok(!html.includes('id="rsvp"'));
  });

  it('PERSONALIZED mode: renders guest name on cover and mounts RsvpForm', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Budi Santoso', customGreeting: null, maxPax: 2 },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      uniqueCode: 'xyz987',
      mode: 'PERSONAL',
    });

    assert.ok(html.includes('Budi Santoso'));
    assert.ok(html.includes('id="rsvp"'));
    assert.ok(html.includes('Konfirmasi Kehadiran'));
  });

  it('strictly excludes wishes feed and wish submission form', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('id="wishes"'));
    assert.ok(!html.includes('wish-form'));
    assert.ok(!html.includes('Titipkan ucapan'));
  });

  it('ensures all interactive buttons have explicit type attribute', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });

    const buttonMatches = html.match(/<button[^>]*>/g) || [];
    assert.ok(buttonMatches.length > 0);
    for (const btn of buttonMatches) {
      assert.ok(
        btn.includes('type="button"') || btn.includes('type="submit"'),
        `Button missing explicit type: ${btn}`,
      );
    }
  });

  it('uses static asset path /templates/serene-garden/garden.png and not ivory-garden', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('/templates/ivory-garden/'));
  });

  it('PUBLIC mode navigation: strictly excludes RSVP section and RSVP nav link (no dead anchor)', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Budi Santoso', customGreeting: null, maxPax: 2 },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      mode: 'PUBLIC',
    });

    // RSVP section and anchor must be completely absent in PUBLIC mode
    assert.ok(!html.includes('id="rsvp"'), 'RSVP section must be absent in PUBLIC mode');
    assert.ok(!html.includes('href="#rsvp"'), 'RSVP nav anchor must be absent in PUBLIC mode');
    assert.ok(!html.includes('<span>RSVP</span>'), 'RSVP nav label must be absent in PUBLIC mode');

    // Other valid nav items must point to existing section IDs
    const hrefMatches = Array.from(html.matchAll(/href="#([^"]+)"/g)).map((m) => m[1]);
    for (const targetId of hrefMatches) {
      assert.ok(
        html.includes(`id="${targetId}"`),
        `Navigation anchor #${targetId} points to missing section in PUBLIC mode`,
      );
    }
  });

  it('PERSONALIZED mode navigation: includes RSVP section and RSVP nav link when RSVP data is active', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Budi Santoso', customGreeting: null, maxPax: 2 },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      uniqueCode: 'abc123xyz',
      mode: 'PERSONAL',
    });

    assert.ok(html.includes('id="rsvp"'), 'RSVP section must be present in PERSONALIZED mode');
    assert.ok(html.includes('href="#rsvp"'), 'RSVP nav anchor must be present in PERSONALIZED mode');
    assert.ok(html.includes('<span>RSVP</span>'), 'RSVP nav label must be present in PERSONALIZED mode');

    // Verify all nav items resolve to existing sections (no dead anchors)
    const hrefMatches = Array.from(html.matchAll(/href="#([^"]+)"/g)).map((m) => m[1]);
    for (const targetId of hrefMatches) {
      assert.ok(
        html.includes(`id="${targetId}"`),
        `Navigation anchor #${targetId} points to missing section in PERSONALIZED mode`,
      );
    }
  });

  it('PERSONALIZED mode without RSVP record: strictly omits RSVP section and RSVP nav link (no dead anchor)', () => {
    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Budi Santoso', customGreeting: null, maxPax: 2 },
        rsvp: undefined,
      },
      uniqueCode: 'abc123xyz',
      mode: 'PERSONAL',
    });

    assert.ok(!html.includes('id="rsvp"'), 'RSVP section must be absent when rsvp is omitted');
    assert.ok(!html.includes('href="#rsvp"'), 'RSVP nav anchor must be absent when rsvp is omitted');
  });

  it('conditional Gift navigation: omits gift section and gift nav item when no gift content exists', () => {
    const noGiftContent = {
      partnerOneName: 'Alya',
      partnerTwoName: 'Raka',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-12-20T08:00',
          venue: 'Masjid Raya',
        },
      ],
    };

    const html = renderSerene({
      data: {
        event: { ...baseEvent, content: noGiftContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('id="gift"'), 'Gift section must be absent when no gift data exists');
    assert.ok(!html.includes('href="#gift"'), 'Gift nav anchor must be absent when no gift data exists');
    assert.ok(!html.includes('<span>Gift</span>'), 'Gift nav label must be absent when no gift data exists');

    // Verify no dead anchors remain
    const hrefMatches = Array.from(html.matchAll(/href="#([^"]+)"/g)).map((m) => m[1]);
    for (const targetId of hrefMatches) {
      assert.ok(
        html.includes(`id="${targetId}"`),
        `Navigation anchor #${targetId} points to missing section`,
      );
    }
  });
});
