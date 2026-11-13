/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock CSS imports for Node.js test runner
require.extensions['.css'] = (module: any) => {
  module.exports = {};
};

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let CountdownSection: typeof import('./CountdownSection').CountdownSection;
let GiftSection: typeof import('./GiftSection').GiftSection;
let WishesSection: typeof import('./WishesSection').WishesSection;
let RsvpSection: typeof import('./RsvpSection').RsvpSection;

before(async () => {
  const mod = await import('./index');
  CountdownSection = mod.CountdownSection;
  GiftSection = mod.GiftSection;
  WishesSection = mod.WishesSection;
  RsvpSection = mod.RsvpSection;
});

describe('Shared Template Sections', () => {
  describe('CountdownSection', () => {
    it('renders a timer with accessible role and time labels', () => {
      const html = renderToStaticMarkup(
        React.createElement(CountdownSection, {
          datetime: '2026-12-31T23:59:59Z',
          className: 'countdown-wrap',
        }),
      );
      assert.match(html, /role="timer"/);
      assert.match(html, /aria-label="Hitung mundur menuju acara"/);
      assert.match(html, /Hari/);
      assert.match(html, /Jam/);
      assert.match(html, /Menit/);
      assert.match(html, /Detik/);
    });

    it('supports numeric epoch target and custom cultural labels', () => {
      const html = renderToStaticMarkup(
        React.createElement(CountdownSection, {
          epoch: Date.now() + 86400000,
          labels: ['Rahina (Hari)', 'Dauh (Jam)', 'Menit', 'Detik'],
          itemClassName: 'bali-box',
          numberClassName: 'bali-num',
          labelClassName: 'bali-label',
        }),
      );
      assert.match(html, /Rahina \(Hari\)/);
      assert.match(html, /Dauh \(Jam\)/);
      assert.match(html, /bali-box/);
      assert.match(html, /bali-num/);
      assert.match(html, /bali-label/);
    });
  });

  describe('GiftSection', () => {
    it('renders bank accounts, provider, owner and copy button', () => {
      const html = renderToStaticMarkup(
        React.createElement(GiftSection, {
          coupleName: 'Sarah & Farhan',
          accounts: [
            {
              id: 'acc-1',
              provider: 'BCA',
              number: '1234567890',
              owner: 'Sarah Permata',
            },
          ],
        }),
      );
      assert.match(html, /BCA/);
      assert.match(html, /1234567890/);
      assert.match(html, /Sarah Permata/);
      assert.match(html, /Salin Nomor Rekening/);
    });

    it('renders physical gift address when provided', () => {
      const html = renderToStaticMarkup(
        React.createElement(GiftSection, {
          coupleName: 'Sarah & Farhan',
          address: {
            recipient: 'Sarah & Farhan',
            address: 'Jl. Merpati No. 10, Jakarta Selatan',
            phone: '08123456789',
          },
        }),
      );
      assert.match(html, /Kirim Kado Fisik/);
      assert.match(html, /Jl\. Merpati No\. 10/);
      assert.match(html, /08123456789/);
    });
  });

  describe('WishesSection', () => {
    it('renders wishesSlot when provided', () => {
      const html = renderToStaticMarkup(
        React.createElement(WishesSection, {
          wishesSlot: React.createElement('div', { id: 'custom-wishes-slot' }, 'Host Wishes'),
        }),
      );
      assert.match(html, /id="custom-wishes-slot"/);
      assert.match(html, /Host Wishes/);
    });

    it('renders fallback wish items when wishesSlot is omitted', () => {
      const html = renderToStaticMarkup(
        React.createElement(WishesSection, {
          fallbackItems: [
            {
              id: 'w-1',
              name: 'Citra',
              message: 'Selamat berbahagia!',
              dateLabel: 'Kemarin',
            },
          ],
        }),
      );
      assert.match(html, /Citra/);
      assert.match(html, /Selamat berbahagia!/);
      assert.match(html, /Kemarin/);
    });
  });

  describe('RsvpSection', () => {
    it('renders null if neither rsvpSlot nor qrSlot is provided', () => {
      const html = renderToStaticMarkup(
        React.createElement(RsvpSection, {}),
      );
      assert.equal(html, '');
    });

    it('renders rsvpSlot and qrSlot in grid when provided', () => {
      const html = renderToStaticMarkup(
        React.createElement(RsvpSection, {
          rsvpSlot: React.createElement('div', { id: 'slot-rsvp' }, 'RSVP Content'),
          qrSlot: React.createElement('div', { id: 'slot-qr' }, 'QR Content'),
        }),
      );
      assert.match(html, /id="slot-rsvp"/);
      assert.match(html, /id="slot-qr"/);
    });
  });
});
