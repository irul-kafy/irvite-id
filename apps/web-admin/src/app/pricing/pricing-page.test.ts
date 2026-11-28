import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Sidebar includes SUPER_ADMIN Paket & Layanan menu and dedicated /pricing master page', () => {
  const shellPath = path.resolve(
    __dirname,
    '../../components/admin-shell.tsx',
  );
  const shellSrc = fs.readFileSync(shellPath, 'utf8');
  assert.ok(
    shellSrc.includes("id: 'pricing'") &&
      shellSrc.includes("label: 'Paket & Layanan'") &&
      shellSrc.includes("href: '/pricing'"),
    'AdminShell must include Paket & Layanan navigation item pointing to /pricing',
  );
  assert.ok(
    shellSrc.includes("if (item.id === 'pricing')") &&
      shellSrc.includes("userRole === 'SUPER_ADMIN'"),
    'Paket & Layanan sidebar link must be restricted strictly to SUPER_ADMIN',
  );

  const pricingPagePath = path.resolve(__dirname, './page.tsx');
  const pricingSrc = fs.readFileSync(pricingPagePath, 'utf8');
  assert.ok(
    pricingSrc.includes('Kelola Paket &amp; Tarif Layanan') &&
      pricingSrc.includes('Master Tarif Per Layanan') &&
      pricingSrc.includes('Katalog Paket & Harga Coret') &&
      pricingSrc.includes('Daftar Paket Kustom'),
    'Dedicated /pricing page must provide master service rates, strikethrough catalog prices, and custom package presets',
  );
});
