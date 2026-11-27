import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('PackagesCarousel (3 visible cards + horizontal scroll)', () => {
  const carouselPath = path.resolve(__dirname, 'packages-carousel.tsx');
  const landingCssPath = path.resolve(__dirname, '../app/landing.css');
  const undanganPagePath = path.resolve(__dirname, '../app/undangan/page.tsx');

  const carouselSrc = fs.readFileSync(carouselPath, 'utf8');
  const landingCss = fs.readFileSync(landingCssPath, 'utf8');
  const undanganPageSrc = fs.readFileSync(undanganPagePath, 'utf8');

  it('renders PackagesCarousel inside PackagesSection on /undangan', () => {
    assert.ok(
      undanganPageSrc.includes('<PackagesCarousel />'),
      '/undangan must render <PackagesCarousel />',
    );
    assert.ok(
      /\.packages\s+\.shell\s*\{[\s\S]*?max-width:\s*none;[\s\S]*?padding-inline:\s*48px;/m.test(
        landingCss,
      ),
      '.packages .shell must use full shell alignment (max-width: none; padding-inline: 48px) so it is not cramped in the middle',
    );
  });

  it('displays 3 cards primarily on desktop and scrolls remaining cards horizontally with scroll-snap', () => {
    assert.ok(
      /\.packages-carousel-track\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow-x:\s*auto;[\s\S]*?scroll-snap-type:\s*x mandatory;[\s\S]*?overscroll-behavior-x:\s*contain;/m.test(
        landingCss,
      ),
      'track must use horizontal flex + scroll-snap-type: x mandatory + overscroll-behavior-x: contain',
    );
    assert.ok(
      /\.packages-carousel-slide\s*\{[\s\S]*?flex:\s*0 0 calc\(\(100% - 48px\) \/ 3\);[\s\S]*?scroll-snap-align:\s*start;/m.test(
        landingCss,
      ),
      'desktop slide basis must show 3 cards at once: calc((100% - 48px) / 3)',
    );
  });

  it('includes accessible carousel roles, quick-jump pills, prev/next buttons, and all 5 package cards', () => {
    assert.ok(carouselSrc.includes('aria-roledescription="carousel"'));
    assert.ok(carouselSrc.includes('aria-roledescription="slide"'));
    assert.ok(carouselSrc.includes('data-direction="previous"'));
    assert.ok(carouselSrc.includes('data-direction="next"'));
    assert.ok(carouselSrc.includes('data-testid={`package-card-${code}`}'));
    assert.ok(carouselSrc.includes('data-testid="package-card-CUSTOM"'));
    assert.ok(carouselSrc.includes('href="/templates?paket=CUSTOM"'));
    assert.ok(
      carouselSrc.includes('24/hari'),
      'Rakit Sendiri card must specify 24/hari for petugas check-in',
    );
    assert.ok(
      !carouselSrc.includes('(4 jam)'),
      'Rakit Sendiri card must not contain deprecated (4 jam) wording',
    );
  });
});
