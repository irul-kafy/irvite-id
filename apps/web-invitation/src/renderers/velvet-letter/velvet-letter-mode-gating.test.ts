import test from 'node:test';
import assert from 'node:assert';
import {
  resolveVelvetEffectiveMode,
  shouldRenderVelvetGuest,
  shouldRenderVelvetRsvp,
  countVelvetRendererQr,
} from './velvet-letter.gating';

test('Velvet Letter: Mode Gating & Security Tests', async (t) => {
  await t.test('resolveVelvetEffectiveMode resolves PUBLIC and PERSONALIZED correctly', () => {
    assert.strictEqual(resolveVelvetEffectiveMode('PUBLIC'), 'PUBLIC');
    assert.strictEqual(resolveVelvetEffectiveMode(undefined), 'PUBLIC');
    assert.strictEqual(resolveVelvetEffectiveMode('PERSONAL'), 'PERSONALIZED');
    assert.strictEqual(resolveVelvetEffectiveMode('PERSONALIZED'), 'PERSONALIZED');
  });

  await t.test('PUBLIC mode NEVER renders guest even if stray guest object is supplied', () => {
    const strayGuest = { name: 'Hacker Name', maxPax: 2 };
    assert.strictEqual(shouldRenderVelvetGuest('PUBLIC', strayGuest), false);
    assert.strictEqual(shouldRenderVelvetGuest(undefined, strayGuest), false);
  });

  await t.test('PUBLIC mode NEVER renders RSVP even if stray rsvp object is supplied', () => {
    const strayGuest = { name: 'Guest Name' };
    const strayRsvp = { status: 'ATTENDING', pax: 2 };
    assert.strictEqual(shouldRenderVelvetRsvp('PUBLIC', strayGuest, strayRsvp), false);
    assert.strictEqual(shouldRenderVelvetRsvp(undefined, strayGuest, strayRsvp), false);
  });

  await t.test('PERSONALIZED mode renders guest ONLY when trusted guest with valid name is present', () => {
    assert.strictEqual(shouldRenderVelvetGuest('PERSONALIZED', { name: 'Budi Santoso' }), true);
    assert.strictEqual(shouldRenderVelvetGuest('PERSONAL', { name: 'Budi Santoso' }), true);
    assert.strictEqual(shouldRenderVelvetGuest('PERSONALIZED', null), false);
    assert.strictEqual(shouldRenderVelvetGuest('PERSONALIZED', { name: '' }), false);
  });

  await t.test('PERSONALIZED mode renders RSVP ONLY when guest and rsvp data exist', () => {
    const guest = { name: 'Budi Santoso' };
    const rsvp = { status: 'PENDING', pax: 1 };

    assert.strictEqual(shouldRenderVelvetRsvp('PERSONALIZED', guest, rsvp), true);
    assert.strictEqual(shouldRenderVelvetRsvp('PERSONALIZED', null, rsvp), false);
    assert.strictEqual(shouldRenderVelvetRsvp('PERSONALIZED', guest, null), false);
  });

  await t.test('countVelvetRendererQr ALWAYS returns 0', () => {
    assert.strictEqual(countVelvetRendererQr(), 0);
  });
});
