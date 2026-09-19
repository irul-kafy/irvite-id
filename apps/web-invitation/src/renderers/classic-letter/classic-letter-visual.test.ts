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
import assert from 'node:assert/strict';
import React from 'react';
(globalThis as unknown as { React: typeof React }).React = React;
import { renderToStaticMarkup } from 'react-dom/server';
import type { RendererProps } from '../registry';

let ClassicLetter: React.ComponentType<RendererProps>;

function renderClassic(props: Partial<RendererProps> & { data: RendererProps['data'] }): string {
  const el = React.createElement(ClassicLetter, {
    mode: 'PUBLIC',
    ...props,
  });
  return renderToStaticMarkup(el);
}

describe('Phase #12B: Classic Letter Visual & Mode Integration Tests', () => {
  before(async () => {
    const mod = await import('./classic-letter');
    ClassicLetter = mod.default;
  });

  const baseContent = {
    partnerOneName: 'Nadira',
    partnerTwoName: 'Arga',
    partnerOneFullName: 'Nadira Putri',
    partnerTwoFullName: 'Arga Pratama',
    partnerOneFamily: 'Putri pertama Bapak Hendra & Ibu Maya',
    partnerTwoFamily: 'Putra kedua Bapak Surya & Ibu Diana',
    intro: 'Sebuah janji untuk selamanya...',
    quote: 'Some stories are written to last.',
    prayer: 'Dan di antara tanda-tanda kekuasaan-Nya...',
    closing: 'Sampai berjumpa di hari bahagia kami.',
    timeZone: 'Asia/Jakarta',
    ceremonies: [
      {
        title: 'Akad Nikah',
        startDateTime: '2026-11-22T08:00',
        endDateTime: '2026-11-22T10:00',
        venue: 'Gedung Kesenian Jakarta',
        address: 'Jl. Gedung Kesenian No. 1',
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

  const createMockData = (contentOverrides = {}, dataOverrides = {}): RendererProps['data'] => ({
    event: {
      title: 'The Wedding of Nadira & Arga',
      description: null,
      eventDate: '2026-11-22T08:00:00Z',
      locationDetails: null,
      content: {
        ...baseContent,
        ...contentOverrides,
      },
    },
    ...dataOverrides,
  });

  it('renders valid minimal content without throwing', () => {
    const data = createMockData({
      partnerOneFullName: undefined,
      partnerTwoFullName: undefined,
      partnerOneFamily: undefined,
      partnerTwoFamily: undefined,
      intro: undefined,
      quote: undefined,
      prayer: undefined,
      closing: undefined,
      ceremonies: undefined,
      giftAccounts: undefined,
    });
    const html = renderClassic({ data });
    assert.ok(html.includes('Nadira'));
    assert.ok(html.includes('Arga'));
  });

  it('falls back to short name when full name is absent', () => {
    const data = createMockData({
      partnerOneFullName: undefined,
      partnerTwoFullName: undefined,
    });
    const html = renderClassic({ data });
    assert.ok(html.includes('Nadira'));
    assert.ok(html.includes('Arga'));
  });

  it('omits family blocks gracefully without fabricating text when absent', () => {
    const data = createMockData({
      partnerOneFamily: undefined,
      partnerTwoFamily: undefined,
    });
    const html = renderClassic({ data });
    assert.ok(!html.includes('Putri pertama'));
    assert.ok(!html.includes('Putra kedua'));
  });

  it('PUBLIC mode: strictly contains 0 guest name, 0 fake recipient, 0 RSVP, 0 QR', () => {
    const data = createMockData({}, { guest: null, rsvp: null });
    const html = renderClassic({ data, mode: 'PUBLIC' });

    assert.ok(!html.includes('Bapak/Ibu/Saudara/i'));
    assert.ok(!html.includes('Dengan hangat kami mengundang'));
    assert.ok(!html.includes('rsvp'));
    assert.ok(!html.includes('data-guest'));
    assert.ok(!html.includes('guest-qr'));
    assert.ok(!html.includes('download-qr'));
  });

  it('PERSONALIZED mode: renders guest recipient and RSVP form when data is provided', () => {
    const data = createMockData(
      {},
      {
        guest: { name: 'dr. Dimas Surya', maxPax: 2, customGreeting: null },
        rsvp: { attendance: 'attending', pax: 2, note: '' },
      },
    );
    const html = renderClassic({ data, mode: 'PERSONALIZED', uniqueCode: 'ABC-123' });

    assert.ok(html.includes('dr. Dimas Surya'));
    assert.ok(html.includes('Dengan hangat kami mengundang'));
  });

  it('Strictly 0 QR components or SVG QR generators in renderer output across all modes', () => {
    const publicHtml = renderClassic({ data: createMockData(), mode: 'PUBLIC' });
    const personalizedHtml = renderClassic({
      data: createMockData(
        {},
        { guest: { name: 'Tamu', maxPax: 2 }, rsvp: { attendance: 'attending', pax: 2 } },
      ),
      mode: 'PERSONALIZED',
    });

    for (const html of [publicHtml, personalizedHtml]) {
      assert.ok(!html.includes('qrcodegen'));
      assert.ok(!html.includes('guest-qr'));
      assert.ok(!html.includes('guest-ticket'));
      assert.ok(!html.includes('qr-undangan'));
      assert.ok(!html.includes('qr-nav'));
    }
  });

  it('preserves leading zeroes in gift account numbers as strings', () => {
    const data = createMockData();
    const html = renderClassic({ data });
    assert.ok(html.includes('0123456789'));
  });

  it('omits gift section when no gift accounts exist', () => {
    const data = createMockData({ giftAccounts: [] });
    const html = renderClassic({ data });
    assert.ok(!html.includes('Tanda kasih.'));
    assert.ok(!html.includes('Lihat rekening'));
  });

  it('omits wishes feed, calendar/ICS download button, and guest pass section', () => {
    const html = renderClassic({ data: createMockData() });
    assert.ok(!html.includes('Simpan tanggal'));
    assert.ok(!html.includes('calendar-download'));
    assert.ok(!html.includes('guest-pass'));
    assert.ok(!html.includes('cl-wish-list'));
    assert.ok(!html.includes('wish-list'));
  });
});
