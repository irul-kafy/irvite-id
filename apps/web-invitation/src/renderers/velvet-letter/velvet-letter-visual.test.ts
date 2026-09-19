/* eslint-disable @typescript-eslint/no-require-imports */
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
  // Gracefully ignored
}

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import React from 'react';
(globalThis as unknown as { React: typeof React }).React = React;
import { renderToStaticMarkup } from 'react-dom/server';
import type { VelvetLetterProps } from './velvet-letter.types';
import type { PublicMediaDescriptor } from '../../types/public-invitation';

let VelvetLetter: React.ComponentType<VelvetLetterProps>;

function renderVelvet(props: Partial<VelvetLetterProps> & { data: VelvetLetterProps['data'] }): string {
  const el = React.createElement(VelvetLetter, {
    mode: 'PUBLIC',
    ...props,
  });
  return renderToStaticMarkup(el);
}

describe('Phase #13B: Velvet Letter Visual & Mode Integration Tests', () => {
  before(async () => {
    const mod = await import('./velvet-letter');
    VelvetLetter = mod.default;
  });

  const baseContent = {
    partnerOneName: 'Nadira',
    partnerTwoName: 'Arga',
    partnerOneFullName: 'Nadira Putri',
    partnerTwoFullName: 'Arga Pratama',
    partnerOneFamily: 'Putri pertama Bapak Hendra & Ibu Maya',
    partnerTwoFamily: 'Putra kedua Bapak Surya & Ibu Diana',
    intro: 'Sebuah janji untuk selamanya...',
    prayer: 'Semoga setiap langkah kami dipenuhi berkah.',
    closing: 'Merupakan kehormatan bagi kami...',
    giftMessage: 'Doa restu Anda merupakan hadiah terindah.',
    timeZone: 'Asia/Jakarta' as const,
    ceremonies: [
      {
        title: 'Akad Nikah',
        startDateTime: '2026-11-22T08:00',
        endDateTime: '2026-11-22T10:00',
        venue: 'Gedung Kesenian Jakarta',
        address: 'Jl. Gedung Kesenian No. 1, Jakarta Pusat',
        mapsUrl: 'https://maps.google.com/?q=Gedung+Kesenian',
      },
    ],
    giftAccounts: [
      {
        bankName: 'BCA',
        accountNumber: '0123456789',
        accountHolder: 'Nadira Putri',
      },
    ],
  };

  const createMockData = (
    contentOverrides: Record<string, unknown> = {},
    dataOverrides: Partial<VelvetLetterProps['data']> = {},
  ): VelvetLetterProps['data'] => ({
    event: {
      title: 'The Wedding of Nadira & Arga',
      description: null,
      eventDate: '2026-11-22T08:00:00.000Z',
      locationDetails: null,
      content: {
        ...baseContent,
        ...contentOverrides,
      },
    },
    ...dataOverrides,
  });

  it('renders cover, 3D envelope structure, and wax seal with partner initials', () => {
    const html = renderVelvet({
      data: createMockData(),
    });

    assert.ok(html.includes('id="cover"'));
    assert.ok(html.includes('A LETTER OF LOVE'));
    assert.ok(html.includes('Buka undangan'));
    assert.ok(html.includes('id="open-invitation"'));
    assert.ok(html.includes('<span>N</span>'));
    assert.ok(html.includes('<span>A</span>'));
  });

  it('renders desktop margin note with short date', () => {
    const html = renderVelvet({
      data: createMockData(),
    });

    assert.ok(html.includes('A LETTER OF LOVE'));
    assert.ok(html.includes('22 . 11 . 2026'));
  });

  it('renders couple section with I. and II. medallion fallback when photos are absent', () => {
    const html = renderVelvet({
      data: createMockData(),
    });

    assert.ok(html.includes('The beloved'));
    assert.ok(html.includes('I.'));
    assert.ok(html.includes('II.'));
    assert.ok(html.includes('Nadira Putri'));
    assert.ok(html.includes('Arga Pratama'));
  });

  it('renders photo portraits when photos are provided', () => {
    const media: PublicMediaDescriptor[] = [
      {
        id: 'p1',
        src: '/media/nadira.jpg',
        type: 'PHOTO',
        slot: 'partner-one-photo',
        order: 0,
      },
      {
        id: 'p2',
        src: '/media/arga.jpg',
        type: 'PHOTO',
        slot: 'partner-two-photo',
        order: 1,
      },
    ];

    const html = renderVelvet({
      data: createMockData({}, { media }),
    });

    assert.ok(html.includes('src="/media/nadira.jpg"'));
    assert.ok(html.includes('src="/media/arga.jpg"'));
  });

  it('renders ceremony content with time range, venue, and Google Maps CTA', () => {
    const html = renderVelvet({
      data: createMockData(),
    });

    assert.ok(html.includes('Akad Nikah'));
    assert.ok(html.includes('08:00 – 10:00 WIB'));
    assert.ok(html.includes('Gedung Kesenian Jakarta'));
    assert.ok(html.includes('Buka Google Maps'));
    assert.ok(html.includes('https://maps.google.com/?q=Gedung+Kesenian'));
  });

  it('omits prayer section completely when prayer is not provided', () => {
    const html = renderVelvet({
      data: createMockData({ prayer: undefined }),
    });

    assert.strictEqual(html.includes('A PROMISE &amp; A PRAYER'), false);
    assert.strictEqual(html.includes('id="prayer"'), false);
  });

  it('renders prayer section when prayer is provided', () => {
    const html = renderVelvet({
      data: createMockData(),
    });

    assert.ok(html.includes('A PROMISE &amp; A PRAYER'));
    assert.ok(html.includes('id="prayer"'));
    assert.ok(html.includes('Semoga setiap langkah kami dipenuhi berkah.'));
  });

  it('omits gift section completely and removes gift from bottom navigation when both message and accounts are empty', () => {
    const html = renderVelvet({
      data: createMockData({ giftMessage: undefined, giftAccounts: [] }),
    });

    assert.strictEqual(html.includes('id="gift"'), false);
    assert.strictEqual(html.includes('href="#gift"'), false);
  });

  it('renders gift message only without bank cards when giftAccounts is empty', () => {
    const html = renderVelvet({
      data: createMockData({
        giftMessage: 'Doa restu Anda sangat berarti.',
        giftAccounts: [],
      }),
    });

    assert.ok(html.includes('id="gift"'));
    assert.ok(html.includes('Doa restu Anda sangat berarti.'));
    assert.strictEqual(html.includes('NOMOR REKENING'), false);
    assert.ok(html.includes('href="#gift"'));
  });

  it('renders bank cards with copy button when giftAccounts are present', () => {
    const html = renderVelvet({
      data: createMockData(),
    });

    assert.ok(html.includes('NOMOR REKENING'));
    assert.ok(html.includes('0123456789'));
    assert.ok(html.includes('Nadira Putri'));
    assert.ok(html.includes('Salin nomor rekening'));
  });

  it('PUBLIC mode: never renders guest name, "Tamu Undangan", RSVP section, or QR code', () => {
    const html = renderVelvet({
      mode: 'PUBLIC',
      data: createMockData(
        {},
        {
          guest: { name: 'Tamu Undangan', maxPax: 2, customGreeting: null },
          rsvp: { response: 'YES', pax: 2, canRespond: true },
        },
      ),
    });

    assert.strictEqual(html.includes('Sebuah undangan istimewa untuk'), false);
    assert.strictEqual(html.includes('Tamu Undangan'), false);
    assert.strictEqual(html.includes('id="rsvp"'), false);
    assert.strictEqual(html.includes('href="#rsvp"'), false);
    assert.strictEqual(html.includes('guest-pass'), false);
    assert.strictEqual(html.includes('qrcode'), false);
  });

  it('PERSONALIZED mode: renders guest card, mounts RsvpForm, and includes RSVP in bottom navigation', () => {
    const html = renderVelvet({
      mode: 'PERSONALIZED',
      uniqueCode: 'abc123def456',
      data: createMockData(
        {},
        {
          guest: { name: 'Bapak Ahmad & Keluarga', maxPax: 2, customGreeting: null },
          rsvp: { response: 'PENDING', pax: 1, canRespond: true },
        },
      ),
    });

    assert.ok(html.includes('Sebuah undangan istimewa untuk'));
    assert.ok(html.includes('Bapak Ahmad &amp; Keluarga'));
    assert.ok(html.includes('id="rsvp"'));
    assert.ok(html.includes('href="#rsvp"'));
    assert.ok(html.includes('Konfirmasi Kehadiran'));
  });

  it('bottom navigation excludes unsupported prototype sections (#wishes, #guest-pass, #calendar)', () => {
    const html = renderVelvet({
      data: createMockData(),
    });

    assert.strictEqual(html.includes('href="#wishes"'), false);
    assert.strictEqual(html.includes('href="#guest-pass"'), false);
    assert.strictEqual(html.includes('href="#calendar"'), false);
  });
});
