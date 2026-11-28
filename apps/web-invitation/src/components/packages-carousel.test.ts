import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('PackagesShowcase (3-Tab Service Switcher + Center-Peeking Carousel + Strikethrough Pricing)', () => {
  const carouselPath = path.resolve(__dirname, 'packages-carousel.tsx');
  const landingCssPath = path.resolve(__dirname, '../app/landing.css');
  const undanganPagePath = path.resolve(__dirname, '../app/undangan/page.tsx');

  const carouselSrc = fs.readFileSync(carouselPath, 'utf8');
  const landingCss = fs.readFileSync(landingCssPath, 'utf8');
  const undanganPageSrc = fs.readFileSync(undanganPagePath, 'utf8');

  it('renders PackagesCarousel inside full-shell PackagesSection on /undangan', () => {
    assert.ok(
      undanganPageSrc.includes('<PackagesCarousel') &&
        undanganPageSrc.includes('fetchPublicPricingConfig'),
      '/undangan must fetch live pricing config and render <PackagesCarousel />',
    );
    assert.ok(
      undanganPageSrc.includes('Temukan Paket Terbaikmu'),
      '/undangan must display centered heading Temukan Paket Terbaikmu',
    );
    assert.ok(
      /\.packages\s+\.shell\s*\{[\s\S]*?max-width:\s*none;[\s\S]*?padding-inline:\s*48px;/m.test(
        landingCss,
      ),
      '.packages .shell must use full shell alignment (max-width: none; padding-inline: 48px)',
    );
  });

  it('provides 3 service tabs in exact order: Undangan Digital (left), Buku Tamu Digital (center), Custom (right)', () => {
    assert.ok(carouselSrc.includes('role="tablist"'));
    assert.ok(carouselSrc.includes('role="tabpanel"'));
    assert.ok(carouselSrc.includes('id="pkg-panel-UNDANGAN"'));
    assert.ok(carouselSrc.includes('id="pkg-panel-BUKU_TAMU"'));
    assert.ok(carouselSrc.includes('id="pkg-panel-CUSTOM"'));
    assert.ok(
      carouselSrc.includes('Pasti dapat Undangan Digital'),
      'Buku Tamu Digital tab must highlight that Undangan Digital is included',
    );
  });

  it('implements center-peeking horizontal scroll-snap carousel with faded left/right neighbor cards', () => {
    assert.ok(
      /\.packages-carousel-track\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow-x:\s*auto;[\s\S]*?scroll-snap-type:\s*x mandatory;[\s\S]*?overscroll-behavior-x:\s*contain;/m.test(
        landingCss,
      ),
      'track must use horizontal flex + scroll-snap-type: x mandatory + overscroll-behavior-x: contain',
    );
    assert.ok(
      /\.packages-carousel-slide\s*\{[\s\S]*?scroll-snap-align:\s*center;/m.test(
        landingCss,
      ),
      'slides must snap to center so left and right neighbor cards peek on both sides',
    );
    assert.ok(
      /\.packages-carousel-slide\.is-side\s*\{[\s\S]*?opacity:\s*0\.46;[\s\S]*?transform:\s*scale\(0\.91\);/m.test(
        landingCss,
      ),
      'left and right neighbor cards must appear subtly faded and scaled down',
    );
  });

  it('displays strikethrough original prices, interactive Custom a la carte builder, and per acara, maks. 6 jam petugas duration', () => {
    assert.ok(carouselSrc.includes('aria-roledescription="carousel"'));
    assert.ok(carouselSrc.includes('aria-roledescription="slide"'));
    assert.ok(carouselSrc.includes('data-direction="previous"'));
    assert.ok(carouselSrc.includes('data-direction="next"'));
    assert.ok(carouselSrc.includes('package-price-original__digits'));
    assert.ok(carouselSrc.includes("'package-card-SACRED'"));
    assert.ok(
      carouselSrc.includes('`package-card-${code}`') &&
        carouselSrc.includes('data-testid={card.testId}'),
    );
    assert.ok(carouselSrc.includes('data-testid="package-card-CUSTOM"'));
    assert.ok(carouselSrc.includes('href="/templates?paket=CUSTOM"'));
    assert.ok(
      carouselSrc.includes('per acara, maks. 6 jam'),
      'Custom builder must specify per acara, maks. 6 jam for petugas check-in',
    );
    assert.ok(
      !carouselSrc.includes('(4 jam)'),
      'Must not contain deprecated (4 jam) wording',
    );
  });
});
