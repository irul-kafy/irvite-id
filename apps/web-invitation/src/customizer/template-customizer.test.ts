import test from 'node:test';
import assert from 'node:assert/strict';
import { getDemoFixture } from '../demo';
import {
  PATENTED_DESIGN_RULES,
  extractInitialCustomizationState,
  applyClientCustomizationToFixture,
  buildDraftSubmissionPayload,
  buildWhatsappOrderUrl,
} from './template-customizer';

test('Client Personalization Studio & Draft Submission Contract', async (t) => {
  await t.test('PATENTED_DESIGN_RULES enforces locked design rules for IRVITE', () => {
    assert.ok(PATENTED_DESIGN_RULES.length >= 4);
    for (const rule of PATENTED_DESIGN_RULES) {
      assert.equal(rule.status, 'LOCKED_PATENT');
      assert.ok(rule.title.length > 0);
      assert.ok(rule.description.length > 0);
    }
  });

  await t.test('extracts and applies live customization across all 4 production templates without mutating locked config', () => {
    const themeCodes = [
      'SEKAR_KEDATON',
      'AETHERIA',
      'OPALINE_NOCTURNE',
      'RANAH_CINTA',
    ] as const;

    for (const themeCode of themeCodes) {
      const fixture = getDemoFixture(themeCode);
      assert.ok(fixture, `Fixture must exist for ${themeCode}`);

      const originalConfigSnapshot = JSON.stringify(fixture.template);
      const state = extractInitialCustomizationState(fixture);

      state.partnerOneName = 'Alya';
      state.partnerTwoName = 'Bima';
      state.partnerOneFullName = 'Alya Kusuma, S.Psi.';
      state.partnerTwoFullName = 'Bima Prakoso, S.T.';
      state.quoteText = 'Cinta sejati tumbuh dalam ketulusan.';
      state.heroPhoto = {
        slot: 'hero',
        previewUrl: 'blob:http://localhost:3002/custom-hero-123',
        dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        order: 0,
      };
      state.galleryPhotos = [
        {
          slot: 'gallery',
          previewUrl: 'blob:http://localhost:3002/custom-gallery-1',
          dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          order: 0,
        },
      ];

      const updated = applyClientCustomizationToFixture(fixture, state);

      assert.equal(updated.event.title, 'Pernikahan Alya & Bima');
      const content = updated.event.content as Record<string, unknown>;
      assert.equal(content.partnerOneName, 'Alya');
      assert.equal(content.partnerTwoName, 'Bima');
      assert.equal(content.quote, 'Cinta sejati tumbuh dalam ketulusan.');
      assert.equal(content.statement, 'Cinta sejati tumbuh dalam ketulusan.');

      // Verify locked template config is untouched
      assert.equal(JSON.stringify(updated.template), originalConfigSnapshot);

      // Verify custom hero & gallery preview URLs are applied
      assert.equal(
        updated.mediaBySlot?.hero?.[0]?.src,
        'blob:http://localhost:3002/custom-hero-123',
      );
      assert.equal(
        updated.mediaBySlot?.gallery?.[0]?.src,
        'blob:http://localhost:3002/custom-gallery-1',
      );
    }
  });

  await t.test('buildDraftSubmissionPayload maps fields according to template schema', () => {
    const sekarFixture = getDemoFixture('SEKAR_KEDATON')!;
    const sekarState = extractInitialCustomizationState(sekarFixture);
    sekarState.partnerOneName = 'Rania';
    sekarState.partnerTwoName = 'Dimas';
    sekarState.openingText = 'Selamat datang di hari bahagia kami';
    sekarState.quoteText = 'Menyatukan dua hati';
    sekarState.closingText = 'Terima kasih atas doa restu Anda';

    const sekarPayload = buildDraftSubmissionPayload({
      themeCode: 'SEKAR_KEDATON',
      clientName: 'Rania Putri',
      clientWhatsapp: '081299998888',
      clientNotes: 'Mohon proses segera',
      state: sekarState,
    });

    assert.equal(sekarPayload.themeCode, 'SEKAR_KEDATON');
    assert.equal(sekarPayload.clientName, 'Rania Putri');
    assert.equal(sekarPayload.content.intro, 'Selamat datang di hari bahagia kami');
    assert.equal(sekarPayload.content.quote, 'Menyatukan dua hati');
    assert.equal(sekarPayload.content.closing, 'Terima kasih atas doa restu Anda');
    assert.equal(sekarPayload.content.openingText, undefined);

    const aetheriaFixture = getDemoFixture('AETHERIA')!;
    const aetheriaState = extractInitialCustomizationState(aetheriaFixture);
    aetheriaState.openingText = 'Sambutan hangat Aetheria';
    aetheriaState.quoteText = 'Kutipan Aetheria';
    aetheriaState.closingText = 'Penutup Aetheria';

    const aetheriaPayload = buildDraftSubmissionPayload({
      themeCode: 'AETHERIA',
      clientName: 'Lyra',
      clientWhatsapp: '081277776666',
      state: aetheriaState,
    });

    assert.equal(aetheriaPayload.themeCode, 'AETHERIA');
    assert.equal(aetheriaPayload.content.openingText, 'Sambutan hangat Aetheria');
    assert.equal(aetheriaPayload.content.statement, 'Kutipan Aetheria');
    assert.equal(aetheriaPayload.content.closingMessage, 'Penutup Aetheria');
    assert.equal(aetheriaPayload.content.intro, undefined);
  });

  await t.test('buildWhatsappOrderUrl creates a pre-filled WhatsApp Admin link with Draft Reference Code', () => {
    const fixture = getDemoFixture('SEKAR_KEDATON')!;
    const state = extractInitialCustomizationState(fixture);
    state.partnerOneName = 'Nara';
    state.partnerTwoName = 'Arka';

    const url = buildWhatsappOrderUrl({
      adminPhone: '6281122334455',
      referenceCode: 'IRV-99AB',
      templateDisplayName: 'Sekar Kedaton',
      clientName: 'Nara Pramudita',
      clientWhatsapp: '08123456789',
      clientNotes: 'Siap diproses hari ini',
      state,
    });

    assert.ok(url.startsWith('https://wa.me/6281122334455?text='));
    const decoded = decodeURIComponent(url.split('?text=')[1]);
    assert.ok(decoded.includes('#IRV-99AB'));
    assert.ok(decoded.includes('Sekar Kedaton'));
    assert.ok(decoded.includes('Nara & Arka'));
    assert.ok(decoded.includes('Nara Pramudita'));
  });
});

