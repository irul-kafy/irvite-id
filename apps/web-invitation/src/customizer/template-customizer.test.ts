import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getDemoFixture } from '../demo';
import {
  PATENTED_DESIGN_RULES,
  extractInitialCustomizationState,
  applyClientCustomizationToFixture,
  buildDraftSubmissionPayload,
  buildWhatsappOrderUrl,
  getTemplatePhotoSlotsConfig,
  countSupportedUploadedPhotos,
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
      state.storyPhoto = {
        slot: 'story',
        previewUrl: 'blob:http://localhost:3002/custom-story-123',
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
      assert.equal(
        updated.mediaBySlot?.story?.[0]?.src,
        'blob:http://localhost:3002/custom-story-123',
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

  await t.test('getTemplatePhotoSlotsConfig enforces exact per-template photo slot counts and dynamic future template fallback', () => {
    const ranahSlots = getTemplatePhotoSlotsConfig('RANAH_CINTA');
    assert.deepEqual(
      ranahSlots.map((s) => s.slot),
      ['hero', 'bride', 'groom'],
      'Ranah Cinta must have exactly 3 photo slots (hero, bride, groom)',
    );

    const sekarSlots = getTemplatePhotoSlotsConfig('SEKAR_KEDATON');
    assert.deepEqual(
      sekarSlots.map((s) => s.slot),
      ['hero', 'bride', 'groom', 'gallery'],
      'Sekar Kedaton must have exactly 4 photo slots (hero, bride, groom, gallery)',
    );

    const aetheriaSlots = getTemplatePhotoSlotsConfig('AETHERIA');
    assert.deepEqual(
      aetheriaSlots.map((s) => s.slot),
      ['hero', 'bride', 'groom', 'story', 'gallery', 'closing'],
      'Aetheria must have all 6 photo slots',
    );

    const opalineSlots = getTemplatePhotoSlotsConfig('OPALINE_NOCTURNE');
    assert.deepEqual(
      opalineSlots.map((s) => s.slot),
      ['hero', 'bride', 'groom', 'gallery', 'closing'],
      'Opaline Nocturne must have exactly 5 photo slots (no story photo slot)',
    );

    // Verify slugs and aliases with hyphens map accurately
    assert.deepEqual(
      getTemplatePhotoSlotsConfig('ranah-cinta').map((s) => s.slot),
      ['hero', 'bride', 'groom'],
      'Ranah Cinta slug must resolve to exactly 3 photo slots',
    );
    assert.deepEqual(
      getTemplatePhotoSlotsConfig('ranah-asmara').map((s) => s.slot),
      ['hero', 'bride', 'groom'],
      'Ranah Asmara alias must resolve to exactly 3 photo slots',
    );
    assert.deepEqual(
      getTemplatePhotoSlotsConfig('sekar-kedaton').map((s) => s.slot),
      ['hero', 'bride', 'groom', 'gallery'],
      'Sekar Kedaton slug must resolve to exactly 4 photo slots',
    );
    assert.deepEqual(
      getTemplatePhotoSlotsConfig('opaline-nocturne').map((s) => s.slot),
      ['hero', 'bride', 'groom', 'gallery', 'closing'],
      'Opaline Nocturne slug must resolve to exactly 5 photo slots',
    );
    assert.deepEqual(
      getTemplatePhotoSlotsConfig('enchanted-woodland').map((s) => s.slot),
      ['hero', 'bride', 'groom', 'story', 'gallery', 'closing'],
      'Enchanted Woodland alias must resolve to all 6 photo slots',
    );

    // Verify Ranah Cinta draft submission never includes unsupported slots
    const ranahFixture = getDemoFixture('RANAH_CINTA')!;
    const ranahState = extractInitialCustomizationState(ranahFixture);
    ranahState.heroPhoto = {
      slot: 'hero',
      previewUrl: 'blob:1',
      dataUrl: 'data:image/jpeg;base64,AA==',
      order: 0,
    };
    ranahState.bridePhoto = {
      slot: 'bride',
      previewUrl: 'blob:2',
      dataUrl: 'data:image/jpeg;base64,BB==',
      order: 0,
    };
    ranahState.groomPhoto = {
      slot: 'groom',
      previewUrl: 'blob:3',
      dataUrl: 'data:image/jpeg;base64,CC==',
      order: 0,
    };
    ranahState.storyPhoto = {
      slot: 'story',
      previewUrl: 'blob:4',
      dataUrl: 'data:image/jpeg;base64,DD==',
      order: 0,
    };
    ranahState.closingPhoto = {
      slot: 'closing',
      previewUrl: 'blob:5',
      dataUrl: 'data:image/jpeg;base64,EE==',
      order: 0,
    };
    ranahState.galleryPhotos = [
      {
        slot: 'gallery',
        previewUrl: 'blob:6',
        dataUrl: 'data:image/jpeg;base64,FF==',
        order: 0,
      },
    ];

    assert.equal(countSupportedUploadedPhotos('RANAH_CINTA', ranahState), 3);

    const ranahPayload = buildDraftSubmissionPayload({
      themeCode: 'RANAH_CINTA',
      clientName: 'Salma',
      clientWhatsapp: '08123456789',
      state: ranahState,
    });
    assert.deepEqual(
      ranahPayload.photos.map((p) => p.slot),
      ['hero', 'bride', 'groom'],
    );
  });

  await t.test('Studio drawer header layout prevents reset button multi-line wrap and title truncation', () => {
    const cssPath = path.resolve(__dirname, '../components/template-customizer-studio.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // 1. Reset button must never wrap into 2 lines
    const resetMatch = css.match(/\.irv-studio-drawer__reset-btn\s*\{([^}]+)\}/);
    assert.ok(resetMatch, 'Reset button CSS class must exist');
    assert.match(resetMatch[1], /white-space:\s*nowrap/i, 'Reset button must enforce white-space: nowrap to prevent 2-line break');
    assert.match(resetMatch[1], /flex-shrink:\s*0/i, 'Reset button must enforce flex-shrink: 0');

    // 2. Title must never be cut off with ellipsis
    const titleMatch = css.match(/\.irv-studio-drawer__title\s*\{([^}]+)\}/);
    assert.ok(titleMatch, 'Title CSS class must exist');
    assert.equal(
      /text-overflow:\s*ellipsis/i.test(titleMatch[1]),
      false,
      'Drawer title must NOT have text-overflow: ellipsis to prevent "Sekar Ked..." truncation'
    );
    assert.match(titleMatch[1], /overflow:\s*visible/i, 'Drawer title must have overflow: visible');
  });

  await t.test('giftAccounts supports customizable 1 or 2 accounts and enforces max 2 items', () => {
    const fixture = getDemoFixture('ROYAL_VELVET')!;
    const state = extractInitialCustomizationState(fixture);

    // Scenario 1: Exactly 1 account
    state.giftAccounts = [
      {
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountHolder: 'Citra Kirana',
      },
    ];

    const customizedSingle = applyClientCustomizationToFixture(fixture, state);
    const accountsSingle = (customizedSingle.event.content as any).giftAccounts;
    assert.equal(accountsSingle.length, 1);
    assert.equal(accountsSingle[0].bankName, 'BCA');
    assert.equal(accountsSingle[0].accountNumber, '1234567890');

    const draftSingle = buildDraftSubmissionPayload({
      themeCode: 'ROYAL_VELVET',
      clientName: 'Citra',
      clientWhatsapp: '08123456789',
      state,
    });
    assert.equal((draftSingle.content as any).giftAccounts.length, 1);

    // Scenario 2: 2 accounts
    state.giftAccounts = [
      {
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountHolder: 'Citra Kirana',
      },
      {
        bankName: 'Bank Mandiri',
        accountNumber: '0987654321',
        accountHolder: 'Galih Perkasa',
      },
    ];

    const customizedDouble = applyClientCustomizationToFixture(fixture, state);
    const accountsDouble = (customizedDouble.event.content as any).giftAccounts;
    assert.equal(accountsDouble.length, 2);
    assert.equal(accountsDouble[1].bankName, 'Bank Mandiri');

    const draftDouble = buildDraftSubmissionPayload({
      themeCode: 'ROYAL_VELVET',
      clientName: 'Citra',
      clientWhatsapp: '08123456789',
      state,
    });
    assert.equal((draftDouble.content as any).giftAccounts.length, 2);

    // Scenario 3: Enforce max 2 items if more are supplied
    state.giftAccounts = [
      { bankName: 'BCA', accountNumber: '111', accountHolder: 'A' },
      { bankName: 'Mandiri', accountNumber: '222', accountHolder: 'B' },
      { bankName: 'BRI', accountNumber: '333', accountHolder: 'C' },
    ];

    const customizedCapped = applyClientCustomizationToFixture(fixture, state);
    assert.equal((customizedCapped.event.content as any).giftAccounts.length, 2);

    const draftCapped = buildDraftSubmissionPayload({
      themeCode: 'ROYAL_VELVET',
      clientName: 'Citra',
      clientWhatsapp: '08123456789',
      state,
    });
    assert.equal((draftCapped.content as any).giftAccounts.length, 2);
  });
});
