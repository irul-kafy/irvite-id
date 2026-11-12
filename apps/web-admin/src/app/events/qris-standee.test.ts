import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  STANDEE_SIZES,
  STANDEE_THEMES,
  inferStandeeThemeFromTemplateName,
  extractStandeeCoupleLabel,
  extractStandeeGiftAccounts,
} from './[eventId]/components/qris-standee-display';

test('Admin Dashboard QRIS Standee Display Specifications', async (t) => {
  await t.test('inferStandeeThemeFromTemplateName maps all 6 template families accurately', () => {
    assert.equal(inferStandeeThemeFromTemplateName('Royal Velvet Nocturne'), 'royal-gold');
    assert.equal(inferStandeeThemeFromTemplateName('Sekar Kedaton'), 'kraton-emerald');
    assert.equal(inferStandeeThemeFromTemplateName('Swarga Dewata'), 'bali-prada');
    assert.equal(inferStandeeThemeFromTemplateName('Ranah Cinta'), 'minang-songket');
    assert.equal(inferStandeeThemeFromTemplateName('Opaline Nocturne'), 'nocturne-botanical');
    assert.equal(inferStandeeThemeFromTemplateName('Aetheria'), 'aetheria-celestial');
  });

  await t.test('extractStandeeCoupleLabel prefers partnerOneName & partnerTwoName over title', () => {
    assert.equal(
      extractStandeeCoupleLabel('Pernikahan Citra & Galih', {
        partnerOneName: 'Raras',
        partnerTwoName: 'Bagas',
      }),
      'Raras & Bagas',
    );
    assert.equal(
      extractStandeeCoupleLabel('Pernikahan Citra & Galih', {}),
      'Citra & Galih',
    );
  });

  await t.test('extractStandeeGiftAccounts normalizes accountHolderName and accountHolder', () => {
    const accounts = extractStandeeGiftAccounts({
      giftAccounts: [
        {
          bankName: 'BCA',
          accountNumber: '1234567890',
          accountHolderName: 'Raras Ayuningtyas',
        },
        {
          bankName: 'Mandiri',
          accountNumber: '9876543210',
          accountHolder: 'Bagas Pradipta',
        },
      ],
    });
    assert.equal(accounts.length, 2);
    assert.equal(accounts[0].bankName, 'BCA');
    assert.equal(accounts[0].accountHolder, 'Raras Ayuningtyas');
    assert.equal(accounts[1].bankName, 'Mandiri');
    assert.equal(accounts[1].accountHolder, 'Bagas Pradipta');
  });

  await t.test('STANDEE_SIZES and STANDEE_THEMES provide complete acrylic standee specs', () => {
    assert.equal(STANDEE_SIZES.A5.widthMm, 148);
    assert.equal(STANDEE_SIZES.A5.heightMm, 210);
    assert.equal(STANDEE_SIZES.A6.widthMm, 105);
    assert.equal(STANDEE_SIZES.A6.heightMm, 148);
    assert.equal(Object.keys(STANDEE_THEMES).length, 6);
  });

  await t.test('Event detail page integrates Pajangan QRIS Meja tab and action card', () => {
    const pageSource = readFileSync(path.join(__dirname, './[eventId]/page.tsx'), 'utf8');
    assert.match(pageSource, /id="tab-qris-btn"/);
    assert.match(pageSource, /id="hub-qris-standee-card"/);
    assert.match(pageSource, /<QrisStandeeDisplay/);
  });
});

