import test from 'node:test';
import assert from 'node:assert';
import {
  resolveSundaEffectiveMode,
  shouldRenderSundaGuest,
  shouldRenderSundaRsvp,
  countSundaRendererQr,
} from './sunda-puspa.gating';

test('Sunda Puspa: Mode Gating Contract', async (t) => {
  await t.test('resolves effective mode safely', () => {
    assert.strictEqual(resolveSundaEffectiveMode(undefined), 'PUBLIC');
    assert.strictEqual(resolveSundaEffectiveMode('PUBLIC'), 'PUBLIC');
    assert.strictEqual(resolveSundaEffectiveMode('PERSONAL'), 'PERSONALIZED');
    assert.strictEqual(resolveSundaEffectiveMode('PERSONALIZED'), 'PERSONALIZED');
  });

  await t.test('PUBLIC mode: strictly suppresses guest personalization and RSVP', () => {
    assert.strictEqual(shouldRenderSundaGuest('PUBLIC', { name: 'Budi' }), false);
    assert.strictEqual(shouldRenderSundaRsvp('PUBLIC', { id: 'g1' }, { id: 'r1' }), false);
  });

  await t.test('PERSONALIZED mode: allows guest personalization and RSVP when data is present', () => {
    assert.strictEqual(shouldRenderSundaGuest('PERSONALIZED', { name: 'Budi' }), true);
    assert.strictEqual(shouldRenderSundaGuest('PERSONALIZED', null), false);
    assert.strictEqual(shouldRenderSundaGuest('PERSONALIZED', { name: '' }), false);

    assert.strictEqual(shouldRenderSundaRsvp('PERSONALIZED', { id: 'g1' }, { id: 'r1' }), true);
    assert.strictEqual(shouldRenderSundaRsvp('PERSONALIZED', null, { id: 'r1' }), false);
    assert.strictEqual(shouldRenderSundaRsvp('PERSONALIZED', { id: 'g1' }, null), false);
  });

  await t.test('Sunda renderer strictly adds 0 QR codes', () => {
    assert.strictEqual(countSundaRendererQr(), 0);
  });
});
