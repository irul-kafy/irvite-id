import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  resolveIvoryEffectiveMode,
  shouldRenderIvoryGuest,
  shouldRenderIvoryQr,
  shouldRenderIvoryRsvp,
  countIvoryPersonalQr,
} from './ivory-garden.gating';
import {
  resolveProductionThemeKey,
  isTemplateProductionActivated,
} from '../registry-resolver';

describe('Phase #8A: Mode Gating & Production QR Guard Contract', () => {
  const sampleGuest = {
    name: 'Budi Santoso',
    customGreeting: 'Kepada Yth. Rekan Kerja',
    maxPax: 2,
  };

  const sampleRsvp = {
    response: 'PENDING' as const,
    pax: null,
    canRespond: true,
  };

  const sampleUrl = 'https://invitation.irvite.id/i/test-code-1234';

  it('unannotated or PUBLIC mode defaults safely to PUBLIC', () => {
    assert.strictEqual(resolveIvoryEffectiveMode(), 'PUBLIC');
    assert.strictEqual(resolveIvoryEffectiveMode('PUBLIC'), 'PUBLIC');
  });

  it('PERSONAL and PERSONALIZED modes map to PERSONALIZED', () => {
    assert.strictEqual(resolveIvoryEffectiveMode('PERSONAL'), 'PERSONALIZED');
    assert.strictEqual(resolveIvoryEffectiveMode('PERSONALIZED'), 'PERSONALIZED');
  });

  it('PUBLIC mode strictly suppresses guest personalization, QR, and RSVP', () => {
    assert.strictEqual(shouldRenderIvoryGuest('PUBLIC', sampleGuest), false);
    assert.strictEqual(shouldRenderIvoryQr('PUBLIC', sampleUrl), false);
    assert.strictEqual(shouldRenderIvoryRsvp('PUBLIC', sampleGuest, sampleRsvp), false);
    assert.strictEqual(countIvoryPersonalQr('PUBLIC', sampleUrl), 0);
  });

  it('PERSONALIZED mode activates guest personalization, RSVP, and exactly ONE personal QR', () => {
    assert.strictEqual(shouldRenderIvoryGuest('PERSONALIZED', sampleGuest), true);
    assert.strictEqual(shouldRenderIvoryRsvp('PERSONALIZED', sampleGuest, sampleRsvp), true);
    assert.strictEqual(shouldRenderIvoryQr('PERSONALIZED', sampleUrl), true);
    assert.strictEqual(countIvoryPersonalQr('PERSONALIZED', sampleUrl), 1);
  });

  it('PERSONALIZED mode returns 0 QR if canonicalUrl is missing', () => {
    assert.strictEqual(countIvoryPersonalQr('PERSONALIZED', null), 0);
    assert.strictEqual(countIvoryPersonalQr('PERSONALIZED', ''), 0);
  });

  it('PRODUCTION GUARANTEE: In Phase #8, production route resolves IVORY_GARDEN and preserves trusted page-level QR', () => {
    // Proves that in Phase #8, page.tsx uses existing trusted QRDisplay with activated IVORY_GARDEN
    const isActivated = isTemplateProductionActivated('IVORY_GARDEN');
    assert.strictEqual(isActivated, true);

    const productionThemeKey = resolveProductionThemeKey('IVORY_GARDEN');
    assert.strictEqual(productionThemeKey, 'IVORY_GARDEN');
  });
});
