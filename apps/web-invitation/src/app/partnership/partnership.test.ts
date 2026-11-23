import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Partnership Navigation & Clean Frontend Ticketing Contract', () => {
  const partnershipPagePath = path.resolve(__dirname, 'page.tsx');
  const solusiPagePath = path.resolve(__dirname, 'solusi', 'page.tsx');
  const layananPagePath = path.resolve(__dirname, 'layanan', 'page.tsx');
  const tiketPagePath = path.resolve(__dirname, '..', 'tiket', 'page.tsx');
  const tiketCatalogPath = path.resolve(
    __dirname,
    '..',
    'tiket',
    'components',
    'ticket-catalog-section.tsx',
  );
  const bffRoutePath = path.resolve(
    __dirname,
    '..',
    'api',
    'ticketing',
    'route.ts',
  );
  const removedInvitationStorePath = path.resolve(
    __dirname,
    '..',
    '..',
    'lib',
    'ticketing-store.ts',
  );
  const removedAdminStorePath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'web-admin',
    'src',
    'lib',
    'ticketing-store.ts',
  );

  it('partnership landing page exists and has dedicated B2B navbar without consumer Layanan dropdown', () => {
    assert.ok(
      fs.existsSync(partnershipPagePath),
      'partnership/page.tsx must exist',
    );
    const content = fs.readFileSync(partnershipPagePath, 'utf8');

    assert.strictEqual(
      content.includes('servicesMenuOpen'),
      false,
      'Partnership header must not contain servicesMenuOpen state',
    );
    assert.strictEqual(
      content.includes('setServicesMenuOpen'),
      false,
      'Partnership header must not contain setServicesMenuOpen',
    );

    assert.ok(
      content.includes('/partnership/solusi'),
      'Partnership header must link to /partnership/solusi',
    );
    assert.ok(
      content.includes('/tiket'),
      'Partnership header must link to /tiket',
    );
    assert.ok(
      content.includes('#daftar-event'),
      'Partnership must have anchor link to registration form',
    );
    assert.ok(
      content.includes('submit-inquiry'),
      'Partnership form must submit EO inquiry to API server proxy',
    );
    assert.ok(
      content.includes('Coba lagi'),
      'Partnership form must include honest retry button on API error',
    );
  });

  it('solusi deep-dive page exists and contains the 3 operational pillars, simulator, and onboarding', () => {
    assert.ok(
      fs.existsSync(solusiPagePath),
      'partnership/solusi/page.tsx must exist',
    );
    const content = fs.readFileSync(solusiPagePath, 'utf8');

    assert.ok(
      content.includes('Sistem Ticketing &amp; Pembayaran Otomatis') ||
        content.includes('Sistem Ticketing & Pembayaran Otomatis'),
    );
    assert.ok(
      content.includes('Scanner Gerbang Masuk via Smartphone Gratis'),
    );
    assert.ok(
      content.includes('Tiket Gelang Fisik (Wristband) 300 DPI Tahan Air'),
    );

    assert.ok(
      content.includes(
        'Hitung Estimasi Penjualan &amp; Pencairan Dana Bersih Anda',
      ) ||
        content.includes(
          'Hitung Estimasi Penjualan & Pencairan Dana Bersih Anda',
        ),
    );
    assert.ok(
      content.includes('4 Langkah Mudah dari Pendaftaran hingga Pencairan'),
    );

    assert.ok(content.includes('/partnership'));
    assert.ok(content.includes('/partnership#daftar-event'));
  });

  it('layanan alias route exists and re-exports solusi page', () => {
    assert.ok(
      fs.existsSync(layananPagePath),
      'partnership/layanan/page.tsx must exist',
    );
    const content = fs.readFileSync(layananPagePath, 'utf8');
    assert.ok(content.includes('../solusi/page'));
  });

  it('deletes legacy ticketing-store.ts files and strictly forbids INITIAL_EVENTS, DeterministicQrMatrix, or local fallback', () => {
    assert.strictEqual(
      fs.existsSync(removedInvitationStorePath),
      false,
      'apps/web-invitation/src/lib/ticketing-store.ts must be deleted',
    );
    assert.strictEqual(
      fs.existsSync(removedAdminStorePath),
      false,
      'apps/web-admin/src/lib/ticketing-store.ts must be deleted',
    );

    const mainPage = fs.readFileSync(partnershipPagePath, 'utf8');
    const solusiPage = fs.readFileSync(solusiPagePath, 'utf8');
    const tiketPage = fs.readFileSync(tiketPagePath, 'utf8');
    const tiketCatalog = fs.readFileSync(tiketCatalogPath, 'utf8');
    const bffRoute = fs.readFileSync(bffRoutePath, 'utf8');

    assert.ok(mainPage.includes('@media (max-width: 767px)'));
    assert.ok(solusiPage.includes('@media (max-width: 767px)'));
    assert.ok(mainPage.includes('irv-hero-title'));
    assert.ok(solusiPage.includes('irv-mockup-wrapper'));

    for (const src of [tiketPage, tiketCatalog, bffRoute]) {
      assert.strictEqual(src.includes('INITIAL_EVENTS'), false);
      assert.strictEqual(src.includes('DeterministicQrMatrix'), false);
      assert.strictEqual(src.includes('globalThis'), false);
    }

    assert.ok(
      bffRoute.includes('status: 502'),
      'web-invitation /api/ticketing must return 502 on upstream failure',
    );
    assert.ok(
      tiketCatalog.includes('Coba lagi'),
      'tiket catalog must include honest retry button on API failure',
    );
  });
});
