import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Landing Page & Customizer Lecturer Revisions Contract', async (t) => {
  const landingPagePath = path.resolve(__dirname, 'page.tsx');
  const landingCssPath = path.resolve(__dirname, 'landing.css');
  const navbarPath = path.resolve(__dirname, '../components/landing-navbar.tsx');
  const studioPath = path.resolve(__dirname, '../components/template-customizer-studio.tsx');

  const landingPage = fs.readFileSync(landingPagePath, 'utf8');
  const landingCss = fs.readFileSync(landingCssPath, 'utf8');
  const navbar = fs.readFileSync(navbarPath, 'utf8');
  const studio = fs.readFileSync(studioPath, 'utf8');

  await t.test('1. Navbar is fixed to top with natural Indonesian copywriting "Alur Pemesanan"', () => {
    assert.ok(navbar.includes('Alur Pemesanan'), 'Navbar must use Alur Pemesanan');
    assert.ok(!navbar.includes('>Cara kerja<'), 'Navbar must not use literal Cara kerja');
    assert.ok(
      /\.site-header\s*\{[\s\S]*?position:\s*fixed;/m.test(landingCss),
      'site-header must have position: fixed in landing.css',
    );
  });

  await t.test('2. Process section uses natural heading and balanced typography', () => {
    assert.ok(landingPage.includes('Alur Pemesanan'), 'Process section eyebrow must be Alur Pemesanan');
    assert.ok(
      landingPage.includes('Alur praktis dari draf hingga undangan siap disebar.'),
      'Process section heading must use natural Indonesian copywriting',
    );
  });

  await t.test('3. Package cards grid is centered and compact', () => {
    assert.ok(
      /\.package-grid\s*\{[\s\S]*?justify-content:\s*center;[\s\S]*?max-width:\s*820px;[\s\S]*?margin:\s*0 auto;/m.test(
        landingCss,
      ),
      'package-grid must be centered with max-width: 820px and margin: 0 auto',
    );
  });

  await t.test('4. Customizer filters numeric input on nicknames, shows 255 char counters, and uses "Ketentuan"', () => {
    assert.ok(
      studio.includes("replace(/[0-9]/g, '')"),
      'Studio must filter digits from nickname inputs',
    );
    assert.ok(
      studio.includes('maxLength={255}') && studio.includes('255 karakter'),
      'Studio must enforce 255 character limit with counter on quote/prayer fields',
    );
    assert.ok(
      studio.includes('Ketentuan'),
      'Studio must use Ketentuan instead of Paten',
    );
  });
});

