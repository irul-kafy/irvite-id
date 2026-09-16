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
// Ensure React is available globally for subcomponents during static rendering tests
(globalThis as unknown as { React: typeof React }).React = React;
import { renderToStaticMarkup } from 'react-dom/server';
import type { RendererProps } from '../registry';

let SundaPuspa: React.ComponentType<RendererProps>;

function renderSunda(props: Partial<RendererProps> & { data: RendererProps['data'] }): string {
  const el = React.createElement(SundaPuspa, {
    mode: 'PUBLIC',
    ...props,
  });
  return renderToStaticMarkup(el);
}

describe('Phase #10B: Sunda Puspa Visual Integration Tests', () => {
  before(async () => {
    const mod = await import('./sunda-puspa');
    SundaPuspa = (mod.default as unknown as { default: React.ComponentType<RendererProps> }).default || mod.default;
  });

  const baseEvent = {
    title: 'Galih & Ratna',
    description: 'Pernikahan Galih & Ratna',
    eventDate: '2026-12-20T08:00',
    locationDetails: 'Bandung',
  };

  const fullContent = {
    partnerOneName: 'Ratna',
    partnerTwoName: 'Galih',
    partnerOneFullName: 'Ratna Kusuma Dewi',
    partnerTwoFullName: 'Galih Purnama Putra',
    partnerOneParents: 'Putri pertama Bapak Rudi & Ibu Maya',
    partnerTwoParents: 'Putra kedua Bapak Ahmad & Ibu Siti',
    coupleGreeting: 'Sampurasun wargi sadaya...',
    openingText: 'Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan...',
    prayerText: 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu...',
    prayerSource: 'QS. Ar-Rum: 21',
    closingText: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami...',
    timeZone: 'Asia/Jakarta',
    ceremonies: [
      {
        title: 'Akad Nikah',
        startDateTime: '2026-12-20T08:00',
        endDateTime: '2026-12-20T10:00',
        venue: 'Bale Asri Sasana Budaya',
        address: 'Jl. Dipati Ukur No. 12, Bandung',
        mapsUrl: 'https://maps.google.com/?q=Bandung',
      },
      {
        title: 'Resepsi Pernikahan',
        startDateTime: '2026-12-20T11:00',
        endDateTime: '2026-12-20T14:00',
        venue: 'Grand Ballroom Sudirman Bandung',
        address: 'Jl. Jend. Sudirman No. 100, Bandung',
      },
    ],
    story: [
      {
        year: '2020',
        title: 'Awal Pertemuan',
        text: 'Kami pertama kali bertemu saat kegiatan kampus di Bandung.',
      },
      {
        year: '2024',
        title: 'Komitmen Bersama',
        text: 'Memutuskan untuk melangkah ke jenjang yang lebih serius.',
      },
    ],
  };

  const mediaWithPhotos = {
    'couple-photo': [
      { id: 'm1', slot: 'couple-photo', type: 'PHOTO' as const, order: 1, src: '/media/couple.jpg', alt: 'Galih & Ratna Bersama' },
    ],
    'gallery': [
      { id: 'g1', slot: 'gallery', type: 'PHOTO' as const, order: 2, src: '/media/gal1.jpg', alt: 'Prewedding 1' },
      { id: 'g2', slot: 'gallery', type: 'PHOTO' as const, order: 3, src: '/media/gal2.jpg', alt: 'Prewedding 2' },
    ],
    'bg-music': [
      { id: 'aud1', slot: 'bg-music', type: 'AUDIO' as const, order: 4, src: '/media/sunda-instrumental.mp3' },
    ],
  };

  it('renders short names on cover, monogram, and closing, and formal full names in couple profiles', () => {
    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        mediaBySlot: mediaWithPhotos,
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('Ratna'));
    assert.ok(html.includes('Galih'));
    assert.ok(html.includes('Ratna Kusuma Dewi'));
    assert.ok(html.includes('Galih Purnama Putra'));
    assert.ok(html.includes('Putri pertama Bapak Rudi &amp; Ibu Maya'));
    assert.ok(html.includes('Putra kedua Bapak Ahmad &amp; Ibu Siti'));
  });

  it('falls back to short names when partnerOneFullName / partnerTwoFullName are omitted', () => {
    const contentWithoutFullNames = {
      ...fullContent,
      partnerOneFullName: undefined,
      partnerTwoFullName: undefined,
    };

    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: contentWithoutFullNames },
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('<h3>Ratna</h3>'));
    assert.ok(html.includes('<h3>Galih</h3>'));
  });

  it('strictly collapses and omits prose when optional fields are empty', () => {
    const minimalContent = {
      partnerOneName: 'Ratna',
      partnerTwoName: 'Galih',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-12-20T08:00',
          venue: 'Bale Asri',
        },
      ],
    };

    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: minimalContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('Sampurasun wargi sadaya...'));
    assert.ok(!html.includes('Maha Suci Allah'));
    assert.ok(!html.includes('QS. Ar-Rum: 21'));
    assert.ok(!html.includes('Putri pertama'));
    assert.ok(!html.includes('<blockquote>'));
  });

  it('renders ceremonies with time range, venue, address, and Google Maps link', () => {
    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('Akad Nikah'));
    assert.ok(html.includes('08:00 \u2013 10:00 WIB'));
    assert.ok(html.includes('Bale Asri Sasana Budaya'));
    assert.ok(html.includes('Jl. Dipati Ukur No. 12, Bandung'));
    assert.ok(html.includes('href="https://maps.google.com/?q=Bandung"'));
    assert.ok(html.includes('target="_blank"'));
    assert.ok(html.includes('rel="noopener noreferrer"'));
    assert.ok(html.includes('Resepsi Pernikahan'));
    assert.ok(html.includes('11:00 \u2013 14:00 WIB'));
    assert.ok(html.includes('Grand Ballroom Sudirman Bandung'));
  });

  it('renders start-only ceremony correctly without showing broken range', () => {
    const startOnlyContent = {
      ...fullContent,
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-12-20T09:00',
          venue: 'Bale Asri',
        },
      ],
    };

    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: startOnlyContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('09:00 WIB'));
    assert.ok(!html.includes('09:00 \u2013 '));
  });

  it('renders joint couple photo when provided, and collapses portrait frame when absent', () => {
    const htmlWithPhotos = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        mediaBySlot: mediaWithPhotos,
      },
      mode: 'PUBLIC',
    });
    assert.ok(htmlWithPhotos.includes('id="couple-portrait"'));
    assert.ok(htmlWithPhotos.includes('src="/media/couple.jpg"'));

    const htmlNoPhotos = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        mediaBySlot: {},
      },
      mode: 'PUBLIC',
    });
    assert.ok(!htmlNoPhotos.includes('id="couple-portrait"'));
  });

  it('renders story timeline when provided, and collapses story section when empty', () => {
    const htmlWithStory = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });
    assert.ok(htmlWithStory.includes('id="story"'));
    assert.ok(htmlWithStory.includes('Awal Pertemuan'));
    assert.ok(htmlWithStory.includes('2020'));
    assert.ok(htmlWithStory.includes('Komitmen Bersama'));
    assert.ok(htmlWithStory.includes('2024'));

    const contentNoStory = { ...fullContent, story: [] };
    const htmlNoStory = renderSunda({
      data: {
        event: { ...baseEvent, content: contentNoStory },
      },
      mode: 'PUBLIC',
    });
    assert.ok(!htmlNoStory.includes('id="story"'));
  });

  it('renders gallery images (max 2) and lightbox trigger when provided, and collapses when empty', () => {
    const htmlWithGallery = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        mediaBySlot: mediaWithPhotos,
      },
      mode: 'PUBLIC',
    });
    assert.ok(htmlWithGallery.includes('id="gallery"'));
    assert.ok(htmlWithGallery.includes('src="/media/gal1.jpg"'));
    assert.ok(htmlWithGallery.includes('src="/media/gal2.jpg"'));

    const htmlNoGallery = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        mediaBySlot: {},
      },
      mode: 'PUBLIC',
    });
    assert.ok(!htmlNoGallery.includes('id="gallery"'));
  });

  it('strictly adds 0 QR codes in Sunda renderer in both PUBLIC and PERSONALIZED modes', () => {
    const htmlPublic = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });
    assert.ok(!htmlPublic.includes('canvas'));
    assert.ok(!htmlPublic.includes('QRCode'));
    assert.ok(!htmlPublic.includes('qrcode'));
    assert.ok(!htmlPublic.includes('qr-code'));
    assert.ok(!htmlPublic.includes('sp-pass'));

    const htmlPersonal = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Kang Dedi', customGreeting: null, maxPax: 2 },
        invitation: { customMessage: null },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      uniqueCode: 'abc123xyz',
      mode: 'PERSONAL',
    });
    assert.ok(!htmlPersonal.includes('canvas'));
    assert.ok(!htmlPersonal.includes('QRCode'));
    assert.ok(!htmlPersonal.includes('qrcode'));
    assert.ok(!htmlPersonal.includes('sp-pass'));
  });

  it('PUBLIC mode: strictly omits guest name and fake recipient placeholder on cover, and omits RSVP', () => {
    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Kang Dedi', customGreeting: null, maxPax: 2 },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('Kang Dedi'));
    assert.ok(!html.includes('Bapak/Ibu/Saudara/i'));
    assert.ok(!html.includes('Tamu Undangan'));
    assert.ok(!html.includes('Dengan bahagia, kami mengundang Anda.'));
    assert.ok(!html.includes('id="rsvp"'));
    assert.ok(!html.includes('href="#rsvp"'));

    // Legitimate cover/open controls remain present
    assert.ok(html.includes('Buka undangan'));
    assert.ok(html.includes('Ratna'));
    assert.ok(html.includes('Galih'));
  });

  it('fails closed when content is invalid (does not render Mempelai Wanita, Mempelai Pria, or silently fallback to Asia/Jakarta)', () => {
    const htmlEmpty = renderSunda({
      data: {
        event: { ...baseEvent, content: {} },
      },
      mode: 'PUBLIC',
    });
    assert.strictEqual(htmlEmpty, '', 'Renderer must return null for empty content');
    assert.ok(!htmlEmpty.includes('Mempelai Wanita'));
    assert.ok(!htmlEmpty.includes('Mempelai Pria'));
    assert.ok(!htmlEmpty.includes('Asia/Jakarta'));

    const htmlMissingPartner = renderSunda({
      data: {
        event: {
          ...baseEvent,
          content: { partnerOneName: 'Galih', timeZone: 'Asia/Jakarta' },
        },
      },
      mode: 'PUBLIC',
    });
    assert.strictEqual(htmlMissingPartner, '', 'Renderer must return null when partnerTwoName missing');
    assert.ok(!htmlMissingPartner.includes('Mempelai Wanita'));
    assert.ok(!htmlMissingPartner.includes('Mempelai Pria'));

    const htmlBadTz = renderSunda({
      data: {
        event: {
          ...baseEvent,
          content: { partnerOneName: 'Galih', partnerTwoName: 'Ratna', timeZone: 'Asia/Singapore' },
        },
      },
      mode: 'PUBLIC',
    });
    assert.strictEqual(htmlBadTz, '', 'Renderer must return null when timeZone is not in allowlist');
  });

  it('PERSONALIZED mode: renders guest name on cover and mounts RsvpForm', () => {
    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Kang Dedi', customGreeting: 'Kahatur Juragan', maxPax: 2 },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      uniqueCode: 'sunda987',
      mode: 'PERSONAL',
    });

    assert.ok(html.includes('Kang Dedi'));
    assert.ok(html.includes('Kahatur Juragan'));
    assert.ok(html.includes('id="rsvp"'));
    assert.ok(html.includes('Konfirmasi Kehadiran'));
  });

  it('strictly excludes gift section, wishes feed, and ICS calendar download', () => {
    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('id="gift"'));
    assert.ok(!html.includes('rekening'));
    assert.ok(!html.includes('id="wishes"'));
    assert.ok(!html.includes('wish-form'));
    assert.ok(!html.includes('.ics'));
  });

  it('ensures all interactive buttons have explicit type="button"', () => {
    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        mediaBySlot: mediaWithPhotos,
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

  it('uses static asset path /templates/sunda-puspa/garden.webp and not other themes', () => {
    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
      },
      mode: 'PUBLIC',
    });

    assert.ok(html.includes('/templates/sunda-puspa/garden.webp'));
    assert.ok(!html.includes('/templates/ivory-garden/'));
    assert.ok(!html.includes('/templates/serene-garden/'));
  });

  it('PUBLIC mode navigation: strictly excludes RSVP nav link (no dead anchor)', () => {
    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Kang Dedi', customGreeting: null, maxPax: 2 },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      mode: 'PUBLIC',
    });

    assert.ok(!html.includes('id="rsvp"'), 'RSVP section must be absent in PUBLIC mode');
    assert.ok(!html.includes('href="#rsvp"'), 'RSVP nav anchor must be absent in PUBLIC mode');
    assert.ok(!html.includes('<span>RSVP</span>'), 'RSVP nav label must be absent in PUBLIC mode');
  });

  it('PERSONALIZED mode navigation: includes RSVP nav link when RSVP is active', () => {
    const html = renderSunda({
      data: {
        event: { ...baseEvent, content: fullContent },
        guest: { name: 'Kang Dedi', customGreeting: null, maxPax: 2 },
        rsvp: { response: 'PENDING', pax: 1, canRespond: true },
      },
      uniqueCode: 'sunda987',
      mode: 'PERSONAL',
    });

    assert.ok(html.includes('id="rsvp"'), 'RSVP section must be present in PERSONALIZED mode');
    assert.ok(html.includes('href="#rsvp"'), 'RSVP nav anchor must be present in PERSONALIZED mode');
    assert.ok(html.includes('<span>RSVP</span>'), 'RSVP nav label must be present in PERSONALIZED mode');
  });
});

