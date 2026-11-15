import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Partnership Navigation & Modular Page Structure Contract', () => {
  const partnershipPagePath = path.resolve(__dirname, 'page.tsx');
  const solusiPagePath = path.resolve(__dirname, 'solusi', 'page.tsx');
  const layananPagePath = path.resolve(__dirname, 'layanan', 'page.tsx');

  it('partnership landing page exists and has dedicated B2B navbar without consumer Layanan dropdown', () => {
    assert.ok(fs.existsSync(partnershipPagePath), 'partnership/page.tsx must exist');
    const content = fs.readFileSync(partnershipPagePath, 'utf8');

    // Must NOT have the consumer Layanan dropdown in partnership navbar
    assert.strictEqual(
      content.includes('servicesMenuOpen'),
      false,
      'Partnership header must not contain servicesMenuOpen state'
    );
    assert.strictEqual(
      content.includes('setServicesMenuOpen'),
      false,
      'Partnership header must not contain setServicesMenuOpen'
    );

    // Must have B2B navigation to Solutions and Ticket Catalog
    assert.ok(
      content.includes('/partnership/solusi'),
      'Partnership header must link to /partnership/solusi'
    );
    assert.ok(
      content.includes('/tiket'),
      'Partnership header must link to /tiket'
    );
    assert.ok(
      content.includes('#daftar-event'),
      'Partnership must have anchor link to registration form'
    );
  });

  it('solusi deep-dive page exists and contains the 3 operational pillars, simulator, and onboarding', () => {
    assert.ok(fs.existsSync(solusiPagePath), 'partnership/solusi/page.tsx must exist');
    const content = fs.readFileSync(solusiPagePath, 'utf8');

    // Contains 3 pillars
    assert.ok(content.includes('Sistem Ticketing & Pembayaran Otomatis'));
    assert.ok(content.includes('Scanner Gerbang Masuk via Smartphone Gratis'));
    assert.ok(content.includes('Tiket Gelang Fisik (Wristband) 300 DPI Tahan Air'));

    // Contains Simulator and Onboarding
    assert.ok(content.includes('Hitung Estimasi Penjualan & Pencairan Dana Bersih Anda'));
    assert.ok(content.includes('4 Langkah Mudah dari Pendaftaran hingga Pencairan'));

    // Links back to main partnership overview
    assert.ok(content.includes('/partnership'));
    assert.ok(content.includes('/partnership#daftar-event'));
  });

  it('layanan alias route exists and re-exports solusi page', () => {
    assert.ok(fs.existsSync(layananPagePath), 'partnership/layanan/page.tsx must exist');
    const content = fs.readFileSync(layananPagePath, 'utf8');
    assert.ok(content.includes('../solusi/page'));
  });

  it('applies ergonomic mobile responsive rules to prevent oversized UI on smartphones', () => {
    const mainPage = fs.readFileSync(partnershipPagePath, 'utf8');
    const solusiPage = fs.readFileSync(solusiPagePath, 'utf8');

    // Check media queries for max-width: 767px
    assert.ok(mainPage.includes('@media (max-width: 767px)'));
    assert.ok(solusiPage.includes('@media (max-width: 767px)'));

    // Ensures compact padding and ergonomic fonts on mobile
    assert.ok(mainPage.includes('irv-hero-title'));
    assert.ok(solusiPage.includes('irv-mockup-wrapper'));
  });
});
