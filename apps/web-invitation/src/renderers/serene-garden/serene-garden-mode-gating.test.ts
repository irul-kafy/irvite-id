import test from 'node:test';
import assert from 'node:assert';
import {
  resolveSereneEffectiveMode,
  shouldRenderSereneGuest,
  shouldRenderSereneRsvp,
  countSereneRendererQr,
} from './serene-garden.gating';

test('Serene Garden: Mode Gating Contract', async (t) => {
  await t.test('resolves effective mode safely', () => {
    assert.strictEqual(resolveSereneEffectiveMode(undefined), 'PUBLIC');
    assert.strictEqual(resolveSereneEffectiveMode('PUBLIC'), 'PUBLIC');
    assert.strictEqual(resolveSereneEffectiveMode('PERSONAL'), 'PERSONALIZED');
    assert.strictEqual(resolveSereneEffectiveMode('PERSONALIZED'), 'PERSONALIZED');
  });

  await t.test('PUBLIC mode: strictly suppresses guest personalization and RSVP', () => {
    assert.strictEqual(shouldRenderSereneGuest('PUBLIC', { name: 'Budi' }), false);
    assert.strictEqual(shouldRenderSereneRsvp('PUBLIC', { id: 'g1' }, { id: 'r1' }), false);
  });

  await t.test('PERSONALIZED mode: allows guest personalization and RSVP when data is present', () => {
    assert.strictEqual(shouldRenderSereneGuest('PERSONALIZED', { name: 'Budi' }), true);
    assert.strictEqual(shouldRenderSereneGuest('PERSONALIZED', null), false);
    assert.strictEqual(shouldRenderSereneGuest('PERSONALIZED', { name: '' }), false);

    assert.strictEqual(shouldRenderSereneRsvp('PERSONALIZED', { id: 'g1' }, { id: 'r1' }), true);
    assert.strictEqual(shouldRenderSereneRsvp('PERSONALIZED', null, { id: 'r1' }), false);
    assert.strictEqual(shouldRenderSereneRsvp('PERSONALIZED', { id: 'g1' }, null), false);
  });

  await t.test('Serene renderer strictly adds 0 QR codes', () => {
    assert.strictEqual(countSereneRendererQr(), 0);
  });
});
