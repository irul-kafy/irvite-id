import test from 'node:test';
import assert from 'node:assert';
import {
  resolveClassicEffectiveMode,
  shouldRenderClassicGuest,
  shouldRenderClassicRsvp,
  countClassicRendererQr,
} from './classic-letter.gating';

test('Classic Letter: Mode Gating Contract', async (t) => {
  await t.test('resolves effective mode safely', () => {
    assert.strictEqual(resolveClassicEffectiveMode(undefined), 'PUBLIC');
    assert.strictEqual(resolveClassicEffectiveMode('PUBLIC'), 'PUBLIC');
    assert.strictEqual(resolveClassicEffectiveMode('PERSONAL'), 'PERSONALIZED');
    assert.strictEqual(resolveClassicEffectiveMode('PERSONALIZED'), 'PERSONALIZED');
  });

  await t.test('PUBLIC mode: strictly suppresses guest personalization and RSVP', () => {
    assert.strictEqual(shouldRenderClassicGuest('PUBLIC', { name: 'Budi' }), false);
    assert.strictEqual(shouldRenderClassicRsvp('PUBLIC', { id: 'g1' }, { id: 'r1' }), false);
  });

  await t.test('PERSONALIZED mode: allows guest personalization and RSVP when data is present', () => {
    assert.strictEqual(shouldRenderClassicGuest('PERSONALIZED', { name: 'Budi' }), true);
    assert.strictEqual(shouldRenderClassicGuest('PERSONALIZED', null), false);
    assert.strictEqual(shouldRenderClassicGuest('PERSONALIZED', { name: '' }), false);

    assert.strictEqual(shouldRenderClassicRsvp('PERSONALIZED', { id: 'g1' }, { id: 'r1' }), true);
    assert.strictEqual(shouldRenderClassicRsvp('PERSONALIZED', null, { id: 'r1' }), false);
    assert.strictEqual(shouldRenderClassicRsvp('PERSONALIZED', { id: 'g1' }, null), false);
  });

  await t.test('Classic Letter renderer strictly produces 0 QR codes', () => {
    assert.strictEqual(countClassicRendererQr(), 0);
  });
});
