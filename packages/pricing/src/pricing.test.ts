import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_PRICE_TIER,
  AKRILIK_QRIS,
  BUKU_TAMU_PACKAGE_CODES,
  CAPACITY_BASE_PRICES,
  CAPACITY_NORMAL_PRICES,
  GLADI_H1,
  PACKAGE_PRICES,
  PETUGAS_EXTRA_HOUR,
  PETUGAS_UNIT,
  SUPERVISOR,
  UNDANGAN_SHOWCASE_CARDS,
  WEDDING_PACKAGE_CATALOG,
  WEDDING_SERVICE_TABS,
  calculateOrderPrice,
  getPackageDisplayLabel,
  getPackageOriginalPrice,
} from './index';

test('unit constants and active price tier match specification', () => {
  assert.equal(PETUGAS_UNIT, 80_000);
  assert.equal(PETUGAS_EXTRA_HOUR, 15_000);
  assert.equal(SUPERVISOR, 120_000);
  assert.equal(AKRILIK_QRIS, 49_000);
  assert.equal(GLADI_H1, 50_000);

  assert.deepEqual(CAPACITY_BASE_PRICES, {
    50: 149_000,
    150: 199_000,
    300: 299_000,
    600: 449_000,
  });

  assert.deepEqual(PACKAGE_PRICES.LAUNCH, {
    SACRED: 149_000,
    INTIMATE: 299_000,
    SIGNATURE: 499_000,
    MAJESTIC: 899_000,
  });

  assert.deepEqual(PACKAGE_PRICES.NORMAL, {
    SACRED: 199_000,
    INTIMATE: 399_000,
    SIGNATURE: 649_000,
    MAJESTIC: 1_149_000,
  });

  assert.equal(ACTIVE_PRICE_TIER, 'LAUNCH');
});

test('each preset package base total matches exact constant in LAUNCH and NORMAL tiers', () => {
  for (const code of ['SACRED', 'INTIMATE', 'SIGNATURE', 'MAJESTIC'] as const) {
    const launchRes = calculateOrderPrice({
      packageCode: code,
      priceTier: 'LAUNCH',
    });
    assert.equal(launchRes.total, PACKAGE_PRICES.LAUNCH[code]);
    assert.equal(launchRes.lineItems.length, 1);
    assert.equal(
      launchRes.entitlements.maxGuests,
      WEDDING_PACKAGE_CATALOG[code].baseCapacity,
    );

    const normalRes = calculateOrderPrice({
      packageCode: code,
      priceTier: 'NORMAL',
    });
    assert.equal(normalRes.total, PACKAGE_PRICES.NORMAL[code]);
    assert.equal(normalRes.lineItems.length, 1);
  }
});

test('preset package entitlements and add-ons compute accurately without double-charging included items', () => {
  // SACRED does not include akrilik or gladi; adding them charges AKRILIK_QRIS + GLADI_H1
  const sacredWithAddons = calculateOrderPrice({
    packageCode: 'SACRED',
    capacityTier: 150,
    options: {
      extraPetugas: 1,
      extraHoursPerPetugas: 2,
      supervisor: 1,
      akrilik: true,
      gladi: true,
    },
  });
  const expectedSacred =
    PACKAGE_PRICES[ACTIVE_PRICE_TIER].SACRED +
    (CAPACITY_BASE_PRICES[150] - CAPACITY_BASE_PRICES[50]) +
    1 * PETUGAS_UNIT +
    1 * 2 * PETUGAS_EXTRA_HOUR +
    SUPERVISOR +
    AKRILIK_QRIS +
    GLADI_H1;
  assert.equal(sacredWithAddons.total, expectedSacred);
  assert.equal(sacredWithAddons.entitlements.maxGuests, 150);
  assert.equal(sacredWithAddons.entitlements.petugasCount, 1);
  assert.equal(sacredWithAddons.entitlements.supervisorCount, 1);
  assert.equal(sacredWithAddons.entitlements.akrilikQris, true);
  assert.equal(sacredWithAddons.entitlements.gladiH1, true);

  // MAJESTIC already includes 600 guests, 4 petugas, 1 supervisor, akrilik, and gladi
  const majesticNoDoubleCharge = calculateOrderPrice({
    packageCode: 'MAJESTIC',
    options: {
      supervisor: 1,
      akrilik: true,
      gladi: true,
    },
  });
  assert.equal(
    majesticNoDoubleCharge.total,
    PACKAGE_PRICES[ACTIVE_PRICE_TIER].MAJESTIC,
  );
  assert.equal(majesticNoDoubleCharge.entitlements.petugasCount, 4);
  assert.equal(majesticNoDoubleCharge.entitlements.supervisorCount, 1);
  assert.equal(majesticNoDoubleCharge.entitlements.postEventReport, true);
  assert.equal(majesticNoDoubleCharge.entitlements.googleSheetLive, true);
});

test('CUSTOM package calculates base capacity plus all components without bundle discount', () => {
  const customMin = calculateOrderPrice({
    packageCode: 'CUSTOM',
  });
  assert.equal(customMin.total, CAPACITY_BASE_PRICES[50]);
  assert.equal(customMin.entitlements.maxGuests, 50);
  assert.equal(customMin.entitlements.petugasCount, 0);

  const customFull = calculateOrderPrice({
    packageCode: 'CUSTOM',
    capacityTier: 300,
    options: {
      extraPetugas: 3,
      extraHoursPerPetugas: 4,
      supervisor: 1,
      akrilik: true,
      gladi: true,
    },
  });
  const expectedCustomFull =
    CAPACITY_BASE_PRICES[300] +
    3 * PETUGAS_UNIT +
    3 * 4 * PETUGAS_EXTRA_HOUR +
    SUPERVISOR +
    AKRILIK_QRIS +
    GLADI_H1;
  assert.equal(customFull.total, expectedCustomFull);
  assert.equal(customFull.entitlements.maxGuests, 300);
  assert.equal(customFull.entitlements.petugasCount, 3);
  assert.equal(customFull.entitlements.extraHoursPerPetugas, 4);
  assert.equal(customFull.entitlements.supervisorCount, 1);
  assert.equal(customFull.entitlements.akrilikQris, true);
  assert.equal(customFull.entitlements.gladiH1, true);
});

test('lower and upper bounds clamp numeric options and ignore extraHours when totalPetugas is 0', () => {
  const lowerBound = calculateOrderPrice({
    packageCode: 'CUSTOM',
    capacityTier: 50,
    options: {
      extraPetugas: -10,
      extraHoursPerPetugas: -5,
      supervisor: -2,
      akrilik: false,
      gladi: false,
    },
  });
  assert.equal(lowerBound.total, CAPACITY_BASE_PRICES[50]);
  assert.equal(lowerBound.normalizedOptions.extraPetugas, 0);
  assert.equal(lowerBound.normalizedOptions.extraHoursPerPetugas, 0);
  assert.equal(lowerBound.normalizedOptions.supervisor, 0);

  // When petugas count is 0, extraHoursPerPetugas cannot add charges
  const zeroPetugasWithHours = calculateOrderPrice({
    packageCode: 'SACRED',
    options: {
      extraPetugas: 0,
      extraHoursPerPetugas: 8,
    },
  });
  assert.equal(
    zeroPetugasWithHours.total,
    PACKAGE_PRICES[ACTIVE_PRICE_TIER].SACRED,
  );
  assert.equal(zeroPetugasWithHours.entitlements.extraHoursPerPetugas, 0);

  // Upper bound: extraPetugas clamped to 20, extraHoursPerPetugas clamped to 8, supervisor clamped to 1
  const upperBound = calculateOrderPrice({
    packageCode: 'CUSTOM',
    capacityTier: 600,
    options: {
      extraPetugas: 99,
      extraHoursPerPetugas: 50,
      supervisor: 10,
      akrilik: true,
      gladi: true,
    },
  });
  assert.equal(upperBound.normalizedOptions.extraPetugas, 20);
  assert.equal(upperBound.normalizedOptions.extraHoursPerPetugas, 8);
  assert.equal(upperBound.normalizedOptions.supervisor, 1);
  const expectedUpper =
    CAPACITY_BASE_PRICES[600] +
    20 * PETUGAS_UNIT +
    20 * 8 * PETUGAS_EXTRA_HOUR +
    SUPERVISOR +
    AKRILIK_QRIS +
    GLADI_H1;
  assert.equal(upperBound.total, expectedUpper);
});

test('tamper attempts: unknown package, invalid capacityTier, capacity downgrade, and injected price fields', () => {
  assert.throws(
    () => calculateOrderPrice({ packageCode: 'UNKNOWN_PKG' }),
    /Unknown or unsupported packageCode/,
  );
  assert.throws(
    () => calculateOrderPrice({ packageCode: 'UNSELECTED' }),
    /Unknown or unsupported packageCode/,
  );
  assert.throws(
    () => calculateOrderPrice({ packageCode: 'GOLD' }),
    /Unknown or unsupported packageCode/,
  );
  assert.throws(
    () => calculateOrderPrice({ packageCode: 'SACRED', capacityTier: 99 }),
    /Invalid capacityTier/,
  );
  assert.throws(
    () =>
      calculateOrderPrice({
        packageCode: 'SACRED',
        options: { extraPetugas: Number.NaN },
      }),
    /Invalid numeric option/,
  );

  // Attempting to downgrade capacity on SIGNATURE (base 300) to 50 to get a negative discount
  const downgradeAttempt = calculateOrderPrice({
    packageCode: 'SIGNATURE',
    capacityTier: 50,
  });
  assert.equal(
    downgradeAttempt.total,
    PACKAGE_PRICES[ACTIVE_PRICE_TIER].SIGNATURE,
  );
  assert.equal(downgradeAttempt.entitlements.maxGuests, 300);

  // Attempting to inject fake total/price properties into input/options
  const tamperedInput = {
    packageCode: 'INTIMATE',
    total: 1000,
    priceAmount: 1000,
    options: {
      extraPetugas: 1,
      total: 1000,
      unitPrice: 0,
    },
  } as unknown as Parameters<typeof calculateOrderPrice>[0];

  const tamperedResult = calculateOrderPrice(tamperedInput);
  assert.equal(
    tamperedResult.total,
    PACKAGE_PRICES[ACTIVE_PRICE_TIER].INTIMATE + PETUGAS_UNIT,
  );
});

test('catalog features do not promise non-existent features and specify 24/hari duration for petugas', () => {
  const forbiddenPatterns = [
    /multi-sesi/i,
    /multi sesi/i,
    /domain kustom/i,
    /custom domain/i,
    /blast whatsapp otomatis/i,
    /cetak kartu qr/i,
    /4\s*jam(?!\s*selesai)/i,
  ];
  for (const pkg of Object.values(WEDDING_PACKAGE_CATALOG)) {
    const combinedText = [pkg.tagline, pkg.description, ...pkg.features].join(
      ' ',
    );
    for (const pattern of forbiddenPatterns) {
      assert.equal(
        pattern.test(combinedText),
        false,
        `Package ${pkg.code} matched forbidden promise or deprecated 4 jam: ${pattern}`,
      );
    }
    assert.ok(
      pkg.features[0].includes(
        `hingga ${pkg.baseCapacity} undangan (1 undangan bisa untuk keluarga)`,
      ),
      `Package ${pkg.code} must describe capacity as hingga N undangan (1 undangan bisa untuk keluarga)`,
    );
  }

  // Check specific 24/hari phrasing for packages that include petugas check-in
  assert.ok(
    WEDDING_PACKAGE_CATALOG.INTIMATE.features.some((f) =>
      f.includes('1 petugas check-in di lokasi (24/hari)'),
    ),
  );
  assert.ok(
    WEDDING_PACKAGE_CATALOG.SIGNATURE.features.some((f) =>
      f.includes('2 petugas check-in di lokasi (24/hari)'),
    ),
  );
  assert.ok(
    WEDDING_PACKAGE_CATALOG.MAJESTIC.features.some((f) =>
      f.includes('4 petugas check-in (24/hari) + 1 supervisor lapangan'),
    ),
  );

  // Line item labels for CUSTOM and preset must also use 24/hari instead of 4 jam
  const customOrder = calculateOrderPrice({
    packageCode: 'CUSTOM',
    options: { extraPetugas: 2 },
  });
  const customPetugasItem = customOrder.lineItems.find(
    (item) => item.code === 'EXTRA_PETUGAS',
  );
  assert.ok(customPetugasItem);
  assert.equal(customPetugasItem.label, 'Petugas Check-in (2 orang × 24/hari)');

  const presetOrder = calculateOrderPrice({
    packageCode: 'SIGNATURE',
    options: { extraPetugas: 1 },
  });
  const presetPetugasItem = presetOrder.lineItems.find(
    (item) => item.code === 'EXTRA_PETUGAS',
  );
  assert.ok(presetPetugasItem);
  assert.equal(presetPetugasItem.label, 'Tambahan Petugas Check-in (1 orang × 24/hari)');
});

test('3-tab service structure (Undangan, Buku Tamu, Custom) and strikethrough original prices match catalog calculations', () => {
  assert.deepEqual(
    WEDDING_SERVICE_TABS.map((t) => t.id),
    ['UNDANGAN', 'BUKU_TAMU', 'CUSTOM'],
  );
  assert.deepEqual(BUKU_TAMU_PACKAGE_CODES, [
    'INTIMATE',
    'SIGNATURE',
    'MAJESTIC',
  ]);

  // Every Buku Tamu package automatically includes full Undangan Digital
  for (const code of BUKU_TAMU_PACKAGE_CODES) {
    assert.equal(WEDDING_PACKAGE_CATALOG[code].serviceCategory, 'BUKU_TAMU');
    assert.equal(WEDDING_PACKAGE_CATALOG[code].includesUndanganDigital, true);
    assert.ok(
      getPackageOriginalPrice(code) > PACKAGE_PRICES.LAUNCH[code],
      `Original price for ${code} must be higher than launch promo price`,
    );
  }

  // Every Undangan showcase card price equals exact calculateOrderPrice(SACRED, capacityTier)
  for (const card of UNDANGAN_SHOWCASE_CARDS) {
    const calc = calculateOrderPrice({
      packageCode: card.packageCode,
      capacityTier: card.capacityTier,
      priceTier: 'LAUNCH',
    });
    assert.equal(card.price, calc.total);
    assert.equal(card.originalPrice, CAPACITY_NORMAL_PRICES[card.capacityTier]);
    assert.ok(card.originalPrice > card.price);
  }
});

test('Super Admin custom package override supports arbitrary guests, per-service unit prices, custom items, and strikethrough originalPriceAmount', () => {
  const customDeal = calculateOrderPrice({
    packageCode: 'CUSTOM',
    options: {
      akrilik: true,
      gladi: true,
      supervisor: 1,
    },
    superAdminOverride: {
      customPackageName: 'Paket Royal VVIP 1500 Tamu',
      customMaxGuests: 1500,
      extraPetugas: 6,
      extraHoursPerPetugas: 2,
      unitPrices: {
        basePrice: 900_000,
        petugasUnit: 100_000,
        petugasExtraHour: 20_000,
        supervisor: 150_000,
        akrilik: 0, // Free bonus
        gladi: 50_000,
      },
      customLineItems: [
        {
          label: 'Sewa Layar Sapa Tamu LED',
          quantity: 1,
          unitPrice: 260_000,
        },
      ],
      entitlements: {
        googleSheetLive: true,
        postEventReport: true,
      },
      originalPriceAmount: 2_390_000,
    },
  });

  // 900k + (6*100k=600k) + (6*2*20k=240k) + 150k + 0 + 50k + 260k = 2,200,000
  assert.equal(customDeal.total, 2_200_000);
  assert.equal(customDeal.normalTotal, 2_390_000);
  assert.equal(customDeal.customPackageName, 'Paket Royal VVIP 1500 Tamu');
  assert.equal(
    getPackageDisplayLabel('CUSTOM', customDeal.customPackageName),
    'Paket Royal VVIP 1500 Tamu',
  );
  assert.equal(customDeal.entitlements.maxGuests, 1500);
  assert.equal(customDeal.entitlements.petugasCount, 6);
  assert.equal(customDeal.entitlements.googleSheetLive, true);
  assert.equal(customDeal.entitlements.postEventReport, true);
});
