import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDemoFixture } from '../../demo';
import type { RendererData } from '../../renderers/registry';
import { adaptRoyalVelvetMedia } from '../../renderers/royal-velvet/royal-velvet.adapter';
import { adaptSekarKedatonMedia } from '../../renderers/sekar-kedaton/sekar-kedaton.adapter';
import { adaptSwargaDewataMedia } from '../../renderers/swarga-dewata/swarga-dewata.adapter';
import { adaptRanahCintaData } from '../../renderers/ranah-cinta/ranah-cinta.adapter';
import { adaptOpalineNocturneData } from '../../renderers/opaline-nocturne/opaline-nocturne.adapter';
import { adaptAetheriaData } from '../../renderers/aetheria/aetheria.adapter';
import {
  extractInitialCustomizationState,
  applyClientCustomizationToFixture,
  buildDraftSubmissionPayload,
} from '../../customizer/template-customizer';

test('QRIS Barcode Integration Across All 6 Templates & Customizer', async (t) => {
  await t.test('All 6 template adapters resolve qrisUrl from mediaBySlot["qris"]', () => {
    const baseFixture = getDemoFixture('ROYAL_VELVET');
    assert.ok(baseFixture, 'ROYAL_VELVET fixture must exist');

    const qrisMediaItem = {
      id: 'qris-test-id',
      type: 'PHOTO' as const,
      slot: 'qris',
      order: 0,
      src: '/events/public/test-slug/media/qris-test-id',
    };
    const payloadWithQris: RendererData = {
      ...baseFixture,
      media: [...(baseFixture.media || []), qrisMediaItem],
      mediaBySlot: {
        ...(baseFixture.mediaBySlot || {}),
        qris: [qrisMediaItem],
      },
    };

    const rv = adaptRoyalVelvetMedia(
      payloadWithQris.mediaBySlot,
      payloadWithQris.media,
      true,
    );
    assert.equal(rv.qrisUrl, '/events/public/test-slug/media/qris-test-id');

    const sk = adaptSekarKedatonMedia(
      payloadWithQris.mediaBySlot,
      payloadWithQris.media,
    );
    assert.equal(sk.qris?.src, '/events/public/test-slug/media/qris-test-id');

    const sd = adaptSwargaDewataMedia(
      payloadWithQris.mediaBySlot,
      payloadWithQris.media,
      true,
    );
    assert.equal(sd.qrisUrl, '/events/public/test-slug/media/qris-test-id');

    const rc = adaptRanahCintaData(payloadWithQris, true);
    assert.equal(rc.gifts.qrisUrl, '/events/public/test-slug/media/qris-test-id');
    assert.equal(rc.features.gift, true);

    const on = adaptOpalineNocturneData(payloadWithQris, true);
    assert.equal(on.gifts.qrisUrl, '/events/public/test-slug/media/qris-test-id');
    assert.equal(on.features?.gift !== false, true);

    const ae = adaptAetheriaData(payloadWithQris, true);
    assert.equal(ae.gifts.qrisUrl, '/events/public/test-slug/media/qris-test-id');
  });

  await t.test('applyClientCustomizationToFixture and buildDraftSubmissionPayload handle qrisPhoto', () => {
    const fixture = getDemoFixture('SEKAR_KEDATON');
    assert.ok(fixture, 'SEKAR_KEDATON fixture must exist');

    const state = extractInitialCustomizationState(fixture);
    assert.equal(state.qrisPhoto, null);

    state.qrisPhoto = {
      slot: 'qris',
      previewUrl: 'blob:https://irvite.id/qris-preview',
      dataUrl: 'data:image/jpeg;base64,QRISDATA==',
      fileName: 'qris-bca.png',
      order: 0,
    };

    const customized = applyClientCustomizationToFixture(fixture, state);
    assert.equal(
      customized.mediaBySlot?.qris?.[0]?.src,
      'blob:https://irvite.id/qris-preview',
    );

    const draftPayload = buildDraftSubmissionPayload({
      themeCode: 'SEKAR_KEDATON',
      clientName: 'Raras',
      clientWhatsapp: '081234567890',
      state,
    });
    const qrisEntry = draftPayload.photos.find((p) => p.slot === 'qris');
    assert.ok(qrisEntry, 'qris slot must be included in draft submission photos');
    assert.equal(qrisEntry.dataUrl, 'data:image/jpeg;base64,QRISDATA==');
  });
});
