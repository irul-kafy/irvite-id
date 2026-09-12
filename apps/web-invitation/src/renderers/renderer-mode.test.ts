import test from 'node:test';
import assert from 'node:assert';
import {
  resolveEffectiveMode,
  shouldRenderGuestPersonalization,
  shouldRenderRsvp,
  shouldRenderGuestQr,
  shouldRenderGiftSection,
  resolveCoverGuestName,
} from './mode-gating';

test('Renderer Mode Safety & Gating (Pure Logic Contract)', async (t) => {
  await t.test('Default mode fallback: unannotated mode defaults safely to PUBLIC', () => {
    assert.strictEqual(resolveEffectiveMode(undefined), 'PUBLIC');
    assert.strictEqual(shouldRenderGuestPersonalization(undefined, true), false);
    assert.strictEqual(shouldRenderRsvp(undefined, true, true), false);
    assert.strictEqual(shouldRenderGuestQr(undefined, false), false);
    assert.strictEqual(shouldRenderGuestQr(undefined, true), false);
    assert.strictEqual(shouldRenderGiftSection(), false);
    assert.strictEqual(resolveCoverGuestName(undefined, 'Budi Santoso'), undefined);
  });

  await t.test('PUBLIC mode: strictly suppresses all personal, rsvp, qr, and gift elements', () => {
    const mode = 'PUBLIC';
    assert.strictEqual(resolveEffectiveMode(mode), 'PUBLIC');

    // Guest personalization must NOT render
    assert.strictEqual(shouldRenderGuestPersonalization(mode, true), false);
    assert.strictEqual(shouldRenderGuestPersonalization(mode, false), false);

    // Cover screen guest hint must be undefined
    assert.strictEqual(resolveCoverGuestName(mode, 'Budi Santoso'), undefined);
    assert.strictEqual(resolveCoverGuestName(mode, null), undefined);

    // RSVP must NEVER render in PUBLIC
    assert.strictEqual(shouldRenderRsvp(mode, true, true), false);
    assert.strictEqual(shouldRenderRsvp(mode, false, true), false);

    // Guest QR / ticket must NEVER render in PUBLIC
    assert.strictEqual(shouldRenderGuestQr(mode, false), false);
    assert.strictEqual(shouldRenderGuestQr(mode, true), false);

    // Gift / QRIS section must NEVER render
    assert.strictEqual(shouldRenderGiftSection(), false);
  });

  await t.test('PERSONAL mode: allows guest personalization and RSVP when records exist', () => {
    const mode = 'PERSONAL';
    assert.strictEqual(resolveEffectiveMode(mode), 'PERSONAL');

    // Guest personalization is enabled when guest exists
    assert.strictEqual(shouldRenderGuestPersonalization(mode, true), true);
    assert.strictEqual(shouldRenderGuestPersonalization(mode, false), false);

    // Cover screen guest hint renders guest name
    assert.strictEqual(resolveCoverGuestName(mode, 'Budi Santoso'), 'Budi Santoso');
    assert.strictEqual(resolveCoverGuestName(mode, null), undefined);

    // RSVP is enabled when both guest and rsvp records exist
    assert.strictEqual(shouldRenderRsvp(mode, true, true), true);
    assert.strictEqual(shouldRenderRsvp(mode, true, false), false);
    assert.strictEqual(shouldRenderRsvp(mode, false, true), false);

    // In production (isPreview === false), in-theme QR is ALWAYS suppressed
    // because page-level QRDisplay renders the single check-in QR
    assert.strictEqual(shouldRenderGuestQr(mode, false), false);

    // Only in Template Studio preview with PERSONAL mode is the in-theme placeholder displayed
    assert.strictEqual(shouldRenderGuestQr(mode, true), true);

    // Gift / QRIS is deferred and suppressed even in PERSONAL mode
    assert.strictEqual(shouldRenderGiftSection(), false);
  });
});
