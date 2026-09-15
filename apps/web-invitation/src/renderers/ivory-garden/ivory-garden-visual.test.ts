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

let IvoryGarden: React.ComponentType<RendererProps>;

// Renders the opened state (all inner sections: hero, greeting, ceremonies, gallery, gift, closing)
function renderOpened(props: Partial<RendererProps> & { data: RendererProps['data'] }): string {
  const el = React.createElement(IvoryGarden, {
    isPreview: true,
    mode: 'PUBLIC',
    ...props,
  });
  return renderToStaticMarkup(el);
}

// Renders the cover state (invitation envelope with recipient name and "Buka undangan" CTA)
function renderCover(props: Partial<RendererProps> & { data: RendererProps['data'] }): string {
  const el = React.createElement(IvoryGarden, {
    isPreview: false,
    mode: 'PUBLIC',
    ...props,
  });
  return renderToStaticMarkup(el);
}

describe('Phase #8B: Ivory Garden Approved Visual Integration Tests', () => {
  before(async () => {
    const mod = await import('./ivory-garden');
    IvoryGarden = (mod.default as unknown as { default: React.ComponentType<RendererProps> }).default || mod.default;
  });

  const baseEvent = {
    title: 'Aditya & Nara',
    description: 'Undangan Pernikahan',
    eventDate: '2026-12-20T10:00',
    locationDetails: 'Grand Ballroom, Hotel Indonesia Kempinski\nJl. M.H. Thamrin No. 1, Jakarta',
  };

  const sampleContent = {
    partnerOneName: 'Aditya Pratama',
    partnerTwoName: 'Nara Anindya',
    partnerOneParents: 'Putra tercinta dari Bapak Dimas & Ibu Sari',
    partnerTwoParents: 'Putri tercinta dari Bapak Arif & Ibu Ratna',
    openingText: 'Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud menyelenggarakan pernikahan.',
    prayerText: 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu.',
    prayerSource: 'QS. Ar-Rum: 21',
    closingText: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu berkenan hadir.',
    timeZone: 'Asia/Jakarta',
    ceremonies: [
      {
        title: 'Akad Nikah',
        dateTime: '2026-12-20T08:00',
        venue: 'Masjid Agung Kempinski',
        address: 'Jl. M.H. Thamrin No. 1, Jakarta',
        mapsUrl: 'https://maps.google.com/?q=Kempinski',
      },
      {
        title: 'Resepsi Pernikahan',
        dateTime: '2026-12-20T11:00',
        venue: 'Grand Ballroom Kempinski',
        address: 'Jl. M.H. Thamrin No. 1, Jakarta',
        mapsUrl: 'https://maps.google.com/?q=Ballroom',
      },
    ],
    giftTitle: 'Tanda Kasih & Hadiah Pernikahan',
    giftMessage: 'Doa restu Anda merupakan karunia terindah bagi kami.',
    giftAccounts: [
      {
        bankName: 'BCA',
        accountNumber: '001234567890',
        accountHolderName: 'Aditya Pratama',
      },
      {
        bankName: 'Mandiri',
        accountNumber: '098765432100',
        accountHolderName: 'Nara Anindya',
      },
    ],
    mapsUrl: 'https://maps.google.com/?q=Hotel+Indonesia',
  };

  // 1. VISUAL CONTRACT & SECTIONS
  it('renders couple names and parents correctly from Event.content', () => {
    const html = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
      },
    });

    assert.ok(html.includes('Aditya Pratama'), 'Should render partnerOneName');
    assert.ok(html.includes('Nara Anindya'), 'Should render partnerTwoName');
    assert.ok(html.includes('Putra tercinta dari Bapak Dimas') && html.includes('Ibu Sari'), 'Should render partnerOneParents');
    assert.ok(html.includes('Putri tercinta dari Bapak Arif') && html.includes('Ibu Ratna'), 'Should render partnerTwoParents');
  });

  it('renders opening, prayer, and closing text when provided', () => {
    const html = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
      },
    });

    assert.ok(html.includes('Dengan memohon rahmat dan ridho Allah SWT'), 'Should render openingText');
    assert.ok(html.includes('Dan di antara tanda-tanda kebesaran-Nya'), 'Should render prayerText');
    assert.ok(html.includes('QS. Ar-Rum: 21'), 'Should render prayerSource');
    assert.ok(html.includes('Merupakan suatu kehormatan dan kebahagiaan'), 'Should render closingText');
  });

  // 2. OPTIONAL CONTENT - NO HARDCODED PROSE FALLBACKS
  it('strictly collapses and omits prose when openingText, prayerText, or closingText are missing', () => {
    const emptyContent = {
      partnerOneName: 'Budi',
      partnerTwoName: 'Siti',
      timeZone: 'Asia/Jakarta',
      // No openingText, prayerText, prayerSource, closingText
    };

    const html = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: emptyContent,
        },
      },
    });

    // Substantive hardcoded text must NOT be present
    assert.ok(!html.includes('Dengan penuh syukur dan bahagia, kami mengundang'), 'Must NOT invent opening prose');
    assert.ok(!html.includes('Ya Allah, berkahilah langkah kami dalam ikatan pernikahan'), 'Must NOT invent prayer prose');
    assert.ok(!html.includes('Ada kebahagiaan yang terasa lebih utuh saat dibagikan'), 'Must NOT invent closing prose');
    assert.ok(!html.includes('blockquote'), 'Must NOT render prayer blockquote when prayerText is empty');
  });

  // 3. CEREMONIES & DATETIME WITHOUT BROWSER TIMEZONE SHIFT
  it('renders ceremonies with exact wall-clock time and Indonesian timezone label (WIB)', () => {
    const html = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: {
            ...sampleContent,
            timeZone: 'Asia/Jakarta',
            ceremonies: [
              {
                title: 'Akad Nikah',
                dateTime: '2026-12-20T10:00',
                venue: 'Venue A',
                address: 'Address A',
              },
            ],
          },
        },
      },
    });

    assert.ok(html.includes('Akad Nikah'), 'Should render ceremony title');
    assert.ok(html.includes('10:00 WIB'), 'Must render 10:00 WIB');
    assert.ok(html.includes('Minggu, 20 Desember 2026'), 'Must render Indonesian day and month');
  });

  it('renders ceremony wall-clock time with WITA and WIT without shifting hours', () => {
    const htmlWita = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: {
            ...sampleContent,
            timeZone: 'Asia/Makassar',
            ceremonies: [
              {
                title: 'Akad Nikah Makassar',
                dateTime: '2026-12-20T10:00',
                venue: 'Venue Makassar',
                address: 'Address Makassar',
              },
            ],
          },
        },
      },
    });
    assert.ok(htmlWita.includes('10:00 WITA'), 'Must render 10:00 WITA');

    const htmlWit = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: {
            ...sampleContent,
            timeZone: 'Asia/Jayapura',
            ceremonies: [
              {
                title: 'Akad Nikah Jayapura',
                dateTime: '2026-12-20T10:00',
                venue: 'Venue Jayapura',
                address: 'Address Jayapura',
              },
            ],
          },
        },
      },
    });
    assert.ok(htmlWit.includes('10:00 WIT'), 'Must render 10:00 WIT');
  });

  // 4. MAPS - ONLY VALIDATED MAPS URL, NO QUERY FALLBACK
  it('renders directions button only when mapsUrl is provided, omits when absent', () => {
    const contentWithMaps = {
      ...sampleContent,
      ceremonies: [
        {
          title: 'Akad with map',
          dateTime: '2026-12-20T10:00',
          venue: 'Venue 1',
          address: 'Address 1',
          mapsUrl: 'https://maps.google.com/?q=Test',
        },
        {
          title: 'Resepsi without map',
          dateTime: '2026-12-20T13:00',
          venue: 'Venue 2',
          address: 'Address 2',
        },
      ],
      mapsUrl: undefined,
    };

    const html = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: contentWithMaps,
        },
      },
    });

    assert.ok(html.includes('href="https://maps.google.com/?q=Test"'), 'Should render valid mapsUrl');
    assert.ok(!html.includes('google.com/maps/search/?api=1&amp;query=Address%202'), 'Must NOT synthesize query fallback');
  });

  // 5. GIFTS & STRICT STRING ACCOUNT NUMBER (LEADING ZEROS)
  it('renders bank accounts with strict string preservation (e.g. 001234567890)', () => {
    const html = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
      },
    });

    assert.ok(html.includes('BCA'), 'Should render bank name BCA');
    assert.ok(html.includes('001234567890'), 'Must strictly preserve leading zeros in account number');
    assert.ok(html.includes('098765432100'), 'Must preserve second account number');
    assert.ok(html.includes('Salin No. Rekening'), 'Should render copy button');
  });

  it('strictly excludes QRIS, giftQr, payment QR images, or payment links', () => {
    const html = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
      },
    });

    assert.ok(!html.includes('QR pembayaran'), 'Must NOT render QR payment label');
    assert.ok(!html.includes('Buka gambar QR'), 'Must NOT render open QR image link');
    assert.ok(!html.includes('qrPlaceholder'), 'Must NOT render QR placeholder box');
    assert.ok(!html.includes('qris'), 'Must NOT mention QRIS');
  });

  // 6. PUBLIC VS PERSONALIZED MODES
  it('PUBLIC mode: strictly omits guest name on cover, custom greeting, and RSVP form', () => {
    const coverHtml = renderCover({
      mode: 'PUBLIC',
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        guest: {
          name: 'Bpk. Hendra Gunawan',
          customGreeting: 'Keluarga Besar',
          maxPax: 2,
        },
      },
    });

    assert.ok(!coverHtml.includes('Bpk. Hendra Gunawan'), 'PUBLIC mode must NOT render guest name on cover');

    const openedHtml = renderOpened({
      mode: 'PUBLIC',
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        guest: {
          name: 'Bpk. Hendra Gunawan',
          customGreeting: 'Keluarga Besar',
          maxPax: 2,
        },
        rsvp: {
          response: 'PENDING',
          pax: null,
          canRespond: true,
        },
      },
    });

    assert.ok(!openedHtml.includes('Keluarga Besar'), 'PUBLIC mode must NOT render custom greeting');
    assert.ok(!openedHtml.includes('Konfirmasi Kehadiran'), 'PUBLIC mode must NOT render RSVP form');
    assert.ok(!openedHtml.includes('qr-display'), 'Renderer must NOT render admission QR');
  });

  it('PERSONALIZED mode: renders guest name on cover, custom greeting, and RSVP form', () => {
    const coverHtml = renderCover({
      mode: 'PERSONAL',
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        guest: {
          name: 'Bpk. Hendra Gunawan',
          customGreeting: 'Keluarga Besar',
          maxPax: 2,
        },
      },
    });

    assert.ok(coverHtml.includes('Bpk. Hendra Gunawan'), 'PERSONALIZED mode must render guest name on cover');

    const openedHtml = renderOpened({
      mode: 'PERSONAL',
      uniqueCode: 'INV-TEST-123',
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        guest: {
          name: 'Bpk. Hendra Gunawan',
          customGreeting: 'Keluarga Besar',
          maxPax: 2,
        },
        rsvp: {
          response: 'PENDING',
          pax: null,
          canRespond: true,
        },
      },
    });

    assert.ok(openedHtml.includes('Keluarga Besar'), 'PERSONALIZED mode must render custom greeting in greeting section');
    assert.ok(openedHtml.includes('Konfirmasi Kehadiran'), 'PERSONALIZED mode must render RSVP form');
    assert.ok(!openedHtml.includes('qr-display'), 'Admission QR is rendered outside at page level, NOT inside IvoryGarden');
  });

  // 7. WISHES EXCLUDED
  it('strictly excludes wishes feed and wish submission form', () => {
    const html = renderOpened({
      mode: 'PERSONAL',
      uniqueCode: 'INV-TEST-123',
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
      },
    });

    assert.ok(!html.includes('Sepucuk doa, sejuta makna'), 'Must NOT render wish section header');
    assert.ok(!html.includes('Kirim doa &amp; ucapan'), 'Must NOT render wish submission button');
    assert.ok(!html.includes('Doa &amp; ucapan'), 'Must NOT render wish textarea');
  });

  // 8. MEDIA SLOTS (HERO, GALLERY 0-6, BG-MUSIC)
  it('handles hero slot correctly (with photo vs without photo)', () => {
    const htmlWithHero = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        media: [
          {
            type: 'PHOTO',
            slot: 'hero',
            order: 0,
            src: '/media/hero-123.jpg',
          },
        ],
      },
    });
    assert.ok(htmlWithHero.includes('/api-proxy/media/hero-123.jpg'), 'Should render hero image src');

    const htmlWithoutHero = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        media: [],
      },
    });
    assert.ok(!htmlWithoutHero.includes('heroPhoto'), 'Must NOT render broken hero image tag when hero photo is missing');
  });

  it('handles gallery slot correctly (0 photos omits section, 1 and 6 photos render)', () => {
    // 0 photos
    const htmlZero = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        media: [],
      },
    });
    assert.ok(!htmlZero.includes('POTONGAN CERITA KAMI'), 'Must omit gallery section when 0 photos');

    // 1 photo
    const htmlOne = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        media: [
          { type: 'PHOTO', slot: 'gallery', order: 0, src: '/media/photo-1.jpg' },
        ],
      },
    });
    assert.ok(htmlOne.includes('/api-proxy/media/photo-1.jpg'), 'Should render 1 gallery photo');

    // 6 photos
    const htmlSix = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        media: [1, 2, 3, 4, 5, 6].map((n) => ({
          type: 'PHOTO' as const,
          slot: 'gallery',
          order: n,
          src: `/media/photo-${n}.jpg`,
        })),
      },
    });
    assert.ok(htmlSix.includes('/api-proxy/media/photo-1.jpg'), 'Should render photo 1');
    assert.ok(htmlSix.includes('/api-proxy/media/photo-6.jpg'), 'Should render photo 6');
  });

  it('handles bg-music slot correctly (mounts audio element only when present)', () => {
    const htmlWithAudio = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        media: [
          {
            type: 'AUDIO',
            slot: 'bg-music',
            order: 0,
            src: '/media/song-123.mp3',
          },
        ],
      },
    });
    assert.ok(htmlWithAudio.includes('<audio'), 'Should mount audio element when bg-music is present');
    assert.ok(htmlWithAudio.includes('/api-proxy/media/song-123.mp3'), 'Audio src should resolve safely');

    const htmlWithoutAudio = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
        media: [],
      },
    });
    assert.ok(!htmlWithoutAudio.includes('<audio'), 'Must NOT mount audio element when bg-music is missing');
  });

  // 9. ACCESSIBILITY & BUTTON TYPES
  it('ensures all buttons have explicit type attribute (type="button")', () => {
    const html = renderOpened({
      data: {
        event: {
          ...baseEvent,
          content: sampleContent,
        },
      },
    });

    const buttonMatches = html.match(/<button([^>]*)>/g) || [];
    assert.ok(buttonMatches.length > 0, 'Should have buttons');
    for (const btn of buttonMatches) {
      assert.ok(btn.includes('type="button"') || btn.includes('type="submit"'), `Button must have type attribute: ${btn}`);
    }
  });

  // 10. PRODUCTION ACTIVATION GUARD CHECK
  it('production registry guard activates IVORY_GARDEN in Phase #8', async () => {
    const { TEMPLATE_PRODUCTION_ACTIVATION, resolveProductionThemeKey } = await import('../registry-resolver');
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION['IVORY_GARDEN'], true, 'Must be activated as true');
    assert.strictEqual(resolveProductionThemeKey('IVORY_GARDEN'), 'IVORY_GARDEN', 'Production must resolve to IVORY_GARDEN');
  });
});
