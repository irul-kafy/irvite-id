'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CAPACITY_TIERS,
  PRESET_PACKAGE_CODES,
  WEDDING_PACKAGE_CATALOG,
  createDefaultMasterPricingConfig,
  normalizeMasterPricingConfig,
  type CapacityTier,
  type CustomPackagePreset,
  type MasterPricingConfig,
  type PresetPackageCode,
} from 'pricing';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount || 0)));
}

function StrikethroughPreviewCard({
  label,
  price,
  originalPrice,
}: {
  label?: string;
  price: number;
  originalPrice: number;
}) {
  const showStrike =
    Number.isFinite(originalPrice) && originalPrice > price && originalPrice > 0;
  return (
    <div
      style={{
        padding: '0.65rem 0.9rem',
        borderRadius: '8px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
      }}
    >
      {label && (
        <div
          style={{
            fontSize: '0.7rem',
            color: '#64748b',
            fontWeight: 600,
            marginBottom: '3px',
          }}
        >
          {label}
        </div>
      )}
      {showStrike && (
        <div
          style={{
            fontSize: '0.84rem',
            color: '#6b7280',
            lineHeight: 1.2,
            marginBottom: '2px',
          }}
        >
          Rp{' '}
          <del style={{ textDecorationThickness: '1.5px' }}>
            {Math.round(originalPrice).toLocaleString('id-ID')}
          </del>
        </div>
      )}
      <div
        style={{
          fontSize: '1.35rem',
          fontWeight: 700,
          color: '#2b2e35',
          fontFamily: 'Georgia, serif',
          lineHeight: 1.15,
        }}
      >
        {formatRupiah(price)}
      </div>
    </div>
  );
}

type MasterPricingTab = 'rates' | 'catalog' | 'custom';

export default function MasterPricingPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<MasterPricingTab>('rates');
  const [config, setConfig] = useState<MasterPricingConfig>(() =>
    createDefaultMasterPricingConfig(),
  );
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/pricing-config', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([authJson, cfgJson]) => {
      if (!mounted) return;
      setUserRole(authJson?.user?.role || null);
      setAuthChecked(true);
      if (cfgJson) {
        setConfig(normalizeMasterPricingConfig(cfgJson));
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveMasterConfig = async () => {
    try {
      setSaving(true);
      setBanner(null);
      const normalized = normalizeMasterPricingConfig(config);
      const res = await fetch('/api/pricing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: normalized }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.message || 'Gagal menyimpan pengaturan paket & layanan',
        );
      }

      const saved = await res.json();
      setConfig(normalizeMasterPricingConfig(saved));
      setBanner({
        type: 'success',
        message:
          'Pengaturan Master Paket & Tarif Layanan berhasil disimpan dan langsung aktif untuk Landing Page serta Pesanan.',
      });
    } catch (err) {
      setBanner({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat menyimpan konfigurasi',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const defaults = createDefaultMasterPricingConfig();
    setConfig((prev) => ({
      ...defaults,
      customPresets: prev.customPresets,
    }));
    setBanner({
      type: 'success',
      message:
        'Angka tarif & katalog dikembalikan ke standar awal. Klik "Simpan Pengaturan Master" untuk menerapkan.',
    });
  };

  const addNewCustomPreset = () => {
    const id = `custom-${Date.now().toString(36)}`;
    const nextPreset: CustomPackagePreset = {
      id,
      name: `Paket Eksklusif ${config.customPresets.length + 1}`,
      tagline: 'Paket khusus kurasi Super Admin',
      description:
        'Sudah termasuk Undangan Digital penuh beserta pendampingan buku tamu resepsi sesuai kebutuhan acara.',
      serviceCategory: 'BUKU_TAMU',
      showOnLanding: false,
      popular: false,
      price: 2_100_000,
      originalPrice: 2_390_000,
      maxGuests: 1000,
      petugasCount: 4,
      extraHoursPerPetugas: 0,
      supervisorCount: 1,
      akrilikQris: true,
      gladiH1: true,
      googleSheetLive: true,
      postEventReport: true,
      features: [
        'Kapasitas hingga 1000 undangan (1 undangan bisa untuk keluarga)',
        'Sudah termasuk Undangan Digital semua tema katalog',
        '4 petugas check-in (24/hari) + 1 supervisor lapangan',
        'Termasuk 1 set stand akrilik QRIS meja & sesi gladi bersih H-1',
        'Sinkronisasi Google Sheet live & laporan kehadiran pasca-acara',
      ],
    };
    setConfig((prev) => ({
      ...prev,
      customPresets: [...prev.customPresets, nextPreset],
    }));
  };

  const computeEstimatedPresetPrices = (preset: CustomPackagePreset) => {
    const rates = config.serviceRates;
    const nearestTier: CapacityTier =
      preset.maxGuests <= 50
        ? 50
        : preset.maxGuests <= 150
          ? 150
          : preset.maxGuests <= 300
            ? 300
            : 600;
    const extraGuestRatio =
      preset.maxGuests > 600 ? Math.ceil((preset.maxGuests - 600) / 100) * 50_000 : 0;

    const promoEstimate =
      rates.capacityPrices[nearestTier] +
      extraGuestRatio +
      preset.petugasCount * rates.petugasUnit +
      (preset.petugasCount > 0
        ? preset.petugasCount *
          preset.extraHoursPerPetugas *
          rates.petugasExtraHour
        : 0) +
      (preset.supervisorCount === 1 ? rates.supervisor : 0) +
      (preset.akrilikQris ? rates.akrilik : 0) +
      (preset.gladiH1 ? rates.gladi : 0);

    const normalEstimate =
      rates.capacityNormalPrices[nearestTier] +
      Math.round(extraGuestRatio * 1.25) +
      preset.petugasCount * rates.petugasUnit +
      (preset.petugasCount > 0
        ? preset.petugasCount *
          preset.extraHoursPerPetugas *
          rates.petugasExtraHour
        : 0) +
      (preset.supervisorCount === 1 ? rates.supervisor : 0) +
      (preset.akrilikQris ? rates.akrilik : 0) +
      (preset.gladiH1 ? rates.gladi : 0);

    return { promoEstimate, normalEstimate };
  };

  if (authChecked && userRole !== 'SUPER_ADMIN') {
    return (
      <div style={{ maxWidth: '760px', margin: '3rem auto', padding: '1.5rem' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b', margin: '0 0 0.5rem' }}>
            Akses Khusus Super Admin
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.25rem' }}>
            Halaman Master Paket &amp; Tarif Layanan hanya dapat diakses dan dikelola oleh akun <strong>SUPER_ADMIN</strong>.
          </p>
          <Link href="/orders" className="btn btn-primary btn-sm">
            Kembali ke Halaman Pesanan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="master-pricing-page"
      style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '999px',
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              color: '#92400e',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginBottom: '0.4rem',
            }}
          >
            👑 Khusus Super Admin
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary, #111814)',
              margin: 0,
            }}
          >
            Kelola Paket &amp; Tarif Layanan
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #4a544e)',
              marginTop: '0.25rem',
            }}
          >
            Atur master harga satuan layanan, harga coret katalog landing page, serta daftar template paket kustom secara terpusat (terpisah dari status operasional pesanan).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link
            href="/orders"
            style={{
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Lihat Pesanan →
          </Link>
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving || loading}
            style={{
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Tarif Standar
          </button>
          <button
            type="button"
            data-testid="save-master-pricing-btn"
            onClick={handleSaveMasterConfig}
            disabled={saving || loading}
            style={{
              padding: '0.55rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              background: '#111814',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Master'}
          </button>
        </div>
      </div>

      {banner && (
        <div
          role="status"
          style={{
            padding: '0.8rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: banner.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${banner.type === 'success' ? '#10b981' : '#f87171'}`,
            color: banner.type === 'success' ? '#065f46' : '#991b1b',
          }}
        >
          {banner.message}
        </div>
      )}

      {/* ── Accessible Tablist (3 Tabs) ── */}
      <div
        role="tablist"
        aria-label="Kategori Pengaturan Paket dan Layanan"
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}
      >
        {(
          [
            {
              id: 'rates',
              label: '1. Master Tarif Per Layanan',
            },
            {
              id: 'catalog',
              label: '2. Katalog Paket & Harga Coret',
            },
            {
              id: 'custom',
              label: `3. Daftar Paket Kustom (${config.customPresets.length})`,
            },
          ] as const
        ).map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`pricing-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`pricing-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.15rem',
                background: 'transparent',
                border: 'none',
                borderBottom: selected
                  ? '3px solid #111814'
                  : '3px solid transparent',
                marginBottom: '-2px',
                color: selected ? '#111814' : '#64748b',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '2.5rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          Memuat konfigurasi master paket &amp; harga...
        </div>
      ) : (
        <>
          {/* ── TAB 1: MASTER TARIF PER LAYANAN ── */}
          <div
            role="tabpanel"
            aria-labelledby="pricing-tab-rates"
            hidden={activeTab !== 'rates'}
          >
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <section
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                }}
              >
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#111814' }}>
                  Tarif Dasar Komponen Layanan (A La Carte &amp; Add-on)
                </h2>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem' }}>
                  Tarif satuan ini menjadi acuan kalkulator tab <strong>Custom</strong> di landing page serta penambahan komponen di halaman Pesanan.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {(
                    [
                      {
                        key: 'petugasUnit',
                        label: 'Petugas Check-in (24/hari)',
                        sub: 'Tarif per 1 orang petugas lokasi',
                      },
                      {
                        key: 'petugasExtraHour',
                        label: 'Jam Tambahan Petugas',
                        sub: 'Tarif lembur per jam per orang',
                      },
                      {
                        key: 'supervisor',
                        label: 'Supervisor Lapangan',
                        sub: 'Koordinator tim buku tamu (1 orang)',
                      },
                      {
                        key: 'akrilik',
                        label: 'Stand Akrilik QRIS Meja',
                        sub: '1 set akrilik QR meja resepsi',
                      },
                      {
                        key: 'gladi',
                        label: 'Sesi Gladi Bersih H-1',
                        sub: 'Pendampingan simulasi sistem H-1',
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '0.9rem',
                      }}
                    >
                      <label
                        htmlFor={`rate-${item.key}`}
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#1e293b',
                        }}
                      >
                        {item.label}
                      </label>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        {item.sub}
                      </div>
                      <input
                        id={`rate-${item.key}`}
                        type="number"
                        min={0}
                        step={1000}
                        value={config.serviceRates[item.key]}
                        onChange={(e) => {
                          const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                          setConfig((prev) => ({
                            ...prev,
                            serviceRates: {
                              ...prev.serviceRates,
                              [item.key]: val,
                            },
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.65rem',
                          borderRadius: '7px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                        }}
                      />
                      <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 600, marginTop: '4px' }}>
                        {formatRupiah(config.serviceRates[item.key])}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                }}
              >
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#111814' }}>
                  Tarif Kuota Dasar Undangan Digital (50 / 150 / 300 / 600 Tamu)
                </h2>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem' }}>
                  Digunakan saat klien merakit sendiri (Custom) maupun saat upgrade kapasitas tamu pada paket standar.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {CAPACITY_TIERS.map((tier) => (
                    <div
                      key={tier}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111814' }}>
                        Kuota hingga {tier} Undangan
                      </div>
                      <div>
                        <label
                          htmlFor={`cap-normal-${tier}`}
                          style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}
                        >
                          Harga Asli / Coret (Rp)
                        </label>
                        <input
                          id={`cap-normal-${tier}`}
                          type="number"
                          min={0}
                          step={5000}
                          value={config.serviceRates.capacityNormalPrices[tier]}
                          onChange={(e) => {
                            const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                            setConfig((prev) => ({
                              ...prev,
                              serviceRates: {
                                ...prev.serviceRates,
                                capacityNormalPrices: {
                                  ...prev.serviceRates.capacityNormalPrices,
                                  [tier]: val,
                                },
                              },
                            }));
                          }}
                          style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`cap-promo-${tier}`}
                          style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', marginBottom: '3px' }}
                        >
                          Harga Jual / Promo (Rp)
                        </label>
                        <input
                          id={`cap-promo-${tier}`}
                          type="number"
                          min={0}
                          step={5000}
                          value={config.serviceRates.capacityPrices[tier]}
                          onChange={(e) => {
                            const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                            setConfig((prev) => ({
                              ...prev,
                              serviceRates: {
                                ...prev.serviceRates,
                                capacityPrices: {
                                  ...prev.serviceRates.capacityPrices,
                                  [tier]: val,
                                },
                              },
                            }));
                          }}
                          style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                        />
                      </div>

                      <StrikethroughPreviewCard
                        label="Tampilan Harga:"
                        price={config.serviceRates.capacityPrices[tier]}
                        originalPrice={config.serviceRates.capacityNormalPrices[tier]}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* ── TAB 2: KATALOG PAKET & HARGA CORET ── */}
          <div
            role="tabpanel"
            aria-labelledby="pricing-tab-catalog"
            hidden={activeTab !== 'catalog'}
          >
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Buku Tamu & Preset Packages */}
              <section
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#111814' }}>
                      Paket Utama Katalog (Buku Tamu Digital &amp; Sacred)
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                      Atur nama, harga asli (coret), harga promo, aktifkan/sembunyikan paket, atau tambah paket baru untuk katalog landing page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextId = `CAT_${Date.now().toString(36).toUpperCase()}`;
                      const nextPreset: CustomPackagePreset = {
                        id: nextId,
                        name: 'Paket Baru Katalog',
                        tagline: 'Solusi lengkap resepsi pernikahan',
                        description: 'Sudah termasuk undangan digital dan sistem QR check-in buku tamu terkelola.',
                        serviceCategory: 'BUKU_TAMU',
                        showOnLanding: true,
                        popular: false,
                        price: 399_000,
                        originalPrice: 499_000,
                        maxGuests: 200,
                        petugasCount: 2,
                        extraHoursPerPetugas: 0,
                        supervisorCount: 0,
                        akrilikQris: true,
                        gladiH1: false,
                        googleSheetLive: true,
                        postEventReport: false,
                        features: [
                          'Kapasitas hingga 200 undangan',
                          'Sudah termasuk Undangan Digital',
                          '2 petugas check-in di lokasi',
                          'Termasuk 1 set stand akrilik QRIS meja',
                          'Sinkronisasi kehadiran Google Sheet live',
                        ],
                      };
                      setConfig((prev) => ({
                        ...prev,
                        customPresets: [...prev.customPresets, nextPreset],
                      }));
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #16a34a',
                      background: '#f0fdf4',
                      color: '#15803d',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    + Tambah Paket Katalog Baru
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {PRESET_PACKAGE_CODES.map((code: PresetPackageCode) => {
                    const item = config.presetPackages[code];
                    const catSpec = WEDDING_PACKAGE_CATALOG[code];
                    const isActive = item.active !== false;
                    return (
                      <div
                        key={code}
                        data-testid={`catalog-preset-card-${code}`}
                        style={{
                          border: isActive ? '1px solid #e2e8f0' : '1px dashed #cbd5e1',
                          borderRadius: '10px',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                          background: isActive ? '#fff' : '#f8fafc',
                          opacity: isActive ? 1 : 0.82,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background:
                                catSpec.serviceCategory === 'BUKU_TAMU'
                                  ? '#eff6ff'
                                  : '#f1f5f9',
                              color:
                                catSpec.serviceCategory === 'BUKU_TAMU'
                                  ? '#1d4ed8'
                                  : '#334155',
                            }}
                          >
                            {code} · Maks. {catSpec.baseCapacity} Tamu
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={item.popular}
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    presetPackages: {
                                      ...prev.presetPackages,
                                      [code]: {
                                        ...prev.presetPackages[code],
                                        popular: e.target.checked,
                                      },
                                    },
                                  }))
                                }
                              />
                              <span>Populer</span>
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  presetPackages: {
                                    ...prev.presetPackages,
                                    [code]: {
                                      ...prev.presetPackages[code],
                                      active: !isActive,
                                    },
                                  },
                                }))
                              }
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: isActive ? '1px solid #fca5a5' : '1px solid #86efac',
                                background: isActive ? '#fef2f2' : '#f0fdf4',
                                color: isActive ? '#b91c1c' : '#15803d',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title={isActive ? 'Sembunyikan paket ini dari katalog' : 'Tampilkan kembali paket ini'}
                            >
                              {isActive ? 'Sembunyikan' : 'Aktifkan'}
                            </button>
                          </div>
                        </div>

                        {!isActive && (
                          <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600, background: '#fee2e2', padding: '3px 8px', borderRadius: '6px' }}>
                            🚫 Disembunyikan dari Katalog Landing Page
                          </div>
                        )}

                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                            Nama Tampil Paket
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                presetPackages: {
                                  ...prev.presetPackages,
                                  [code]: {
                                    ...prev.presetPackages[code],
                                    name: e.target.value,
                                  },
                                },
                              }))
                            }
                            style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                            Tagline Singkat
                          </label>
                          <input
                            type="text"
                            value={item.tagline}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                presetPackages: {
                                  ...prev.presetPackages,
                                  [code]: {
                                    ...prev.presetPackages[code],
                                    tagline: e.target.value,
                                  },
                                },
                              }))
                            }
                            style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>
                              Harga Asli / Coret
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={5000}
                              value={item.originalPrice}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  presetPackages: {
                                    ...prev.presetPackages,
                                    [code]: {
                                      ...prev.presetPackages[code],
                                      originalPrice: Math.max(
                                        0,
                                        Math.round(Number(e.target.value) || 0),
                                      ),
                                    },
                                  },
                                }))
                              }
                              style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                              Harga Promo / Deal
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={5000}
                              value={item.price}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  presetPackages: {
                                    ...prev.presetPackages,
                                    [code]: {
                                      ...prev.presetPackages[code],
                                      price: Math.max(
                                        0,
                                        Math.round(Number(e.target.value) || 0),
                                      ),
                                    },
                                  },
                                }))
                              }
                              style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                            Deskripsi Paragraf Paket
                          </label>
                          <textarea
                            rows={2}
                            value={item.description || ''}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                presetPackages: {
                                  ...prev.presetPackages,
                                  [code]: {
                                    ...prev.presetPackages[code],
                                    description: e.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder="Deskripsi singkat yang tampil di bawah harga..."
                            style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', resize: 'vertical' }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                              Fasilitas Paket (Checklist [✓])
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  presetPackages: {
                                    ...prev.presetPackages,
                                    [code]: {
                                      ...prev.presetPackages[code],
                                      features: [...(prev.presetPackages[code].features || []), 'Poin fasilitas baru'],
                                    },
                                  },
                                }))
                              }
                              style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', cursor: 'pointer' }}
                            >
                              + Tambah
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                            {(item.features || []).map((feat, fIdx) => (
                              <div key={fIdx} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <span style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>
                                <input
                                  type="text"
                                  value={feat}
                                  onChange={(e) =>
                                    setConfig((prev) => ({
                                      ...prev,
                                      presetPackages: {
                                        ...prev.presetPackages,
                                        [code]: {
                                          ...prev.presetPackages[code],
                                          features: (prev.presetPackages[code].features || []).map((f, fi) =>
                                            fi === fIdx ? e.target.value : f
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                  style={{ flex: 1, padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfig((prev) => ({
                                      ...prev,
                                      presetPackages: {
                                        ...prev.presetPackages,
                                        [code]: {
                                          ...prev.presetPackages[code],
                                          features: (prev.presetPackages[code].features || []).filter((_, fi) => fi !== fIdx),
                                        },
                                      },
                                    }))
                                  }
                                  title="Hapus fasilitas"
                                  style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.72rem', width: '22px', height: '22px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <StrikethroughPreviewCard
                          label="Pratinjau Kartu Landing Page:"
                          price={item.price}
                          originalPrice={item.originalPrice}
                        />
                      </div>
                    );
                  })}
                </div>

                {config.customPresets.filter((p) => p.serviceCategory === 'BUKU_TAMU').length > 0 && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        Paket Tambahan Buatan Admin di Katalog ({config.customPresets.filter((p) => p.serviceCategory === 'BUKU_TAMU').length})
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px' }}>
                        Tampil di Landing Page Publik
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))', gap: '1rem' }}>
                      {config.customPresets
                        .map((preset, idx) => ({ preset, originalIdx: idx }))
                        .filter(({ preset }) => preset.serviceCategory === 'BUKU_TAMU')
                        .map(({ preset, originalIdx }) => (
                          <div
                            key={preset.id}
                            style={{
                              border: '1px solid #10b981',
                              borderRadius: '10px',
                              padding: '1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.65rem',
                              background: '#f0fdf4',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#dcfce7', color: '#15803d' }}>
                                PAKET KUSTOM · Maks. {preset.maxGuests} Tamu
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    customPresets: prev.customPresets.filter((_, i) => i !== originalIdx),
                                  }))
                                }
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #fca5a5',
                                  background: '#fef2f2',
                                  color: '#b91c1c',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                                title="Hapus paket tambahan ini dari katalog"
                              >
                                Hapus Paket
                              </button>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                                Nama Tampil Paket
                              </label>
                              <input
                                type="text"
                                value={preset.name}
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    customPresets: prev.customPresets.map((p, i) =>
                                      i === originalIdx ? { ...p, name: e.target.value } : p,
                                    ),
                                  }))
                                }
                                style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                                Tagline Singkat
                              </label>
                              <input
                                type="text"
                                value={preset.tagline}
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    customPresets: prev.customPresets.map((p, i) =>
                                      i === originalIdx ? { ...p, tagline: e.target.value } : p,
                                    ),
                                  }))
                                }
                                style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.82rem' }}
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>
                                  Harga Asli / Coret
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step={5000}
                                  value={preset.originalPrice}
                                  onChange={(e) =>
                                    setConfig((prev) => ({
                                      ...prev,
                                      customPresets: prev.customPresets.map((p, i) =>
                                        i === originalIdx
                                          ? { ...p, originalPrice: Math.max(0, Math.round(Number(e.target.value) || 0)) }
                                          : p,
                                      ),
                                    }))
                                  }
                                  style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem' }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                                  Harga Promo / Deal
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step={5000}
                                  value={preset.price}
                                  onChange={(e) =>
                                    setConfig((prev) => ({
                                      ...prev,
                                      customPresets: prev.customPresets.map((p, i) =>
                                        i === originalIdx
                                          ? { ...p, price: Math.max(0, Math.round(Number(e.target.value) || 0)) }
                                          : p,
                                      ),
                                    }))
                                  }
                                  style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem', fontWeight: 700 }}
                                />
                              </div>
                            </div>

                            <StrikethroughPreviewCard
                              label="Pratinjau Kartu Landing Page:"
                              price={preset.price}
                              originalPrice={preset.originalPrice}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Undangan Digital Showcase Cards */}
              <section
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                }}
              >
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#111814' }}>
                  Kartu Etalase Tab Kiri: Undangan Digital (Sacred 50 / 150 / 300)
                </h2>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem' }}>
                  Mengatur 3 kartu swipe horizontal yang tampil pada tab <strong>Undangan Digital</strong> di landing page publik.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {config.undanganShowcaseCards.map((card, idx) => {
                    const isCardActive = card.active !== false;
                    return (
                      <div
                        key={card.id}
                        style={{
                          border: isCardActive ? '1px solid #e2e8f0' : '1px dashed #cbd5e1',
                          borderRadius: '10px',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                          background: isCardActive ? '#fff' : '#f8fafc',
                          opacity: isCardActive ? 1 : 0.82,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
                            Kuota {card.capacityTier} Undangan
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={card.popular}
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    undanganShowcaseCards:
                                      prev.undanganShowcaseCards.map((c, i) =>
                                        i === idx
                                          ? { ...c, popular: e.target.checked }
                                          : c,
                                      ),
                                  }))
                                }
                              />
                              <span>Populer</span>
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  undanganShowcaseCards:
                                    prev.undanganShowcaseCards.map((c, i) =>
                                      i === idx
                                        ? { ...c, active: !isCardActive }
                                        : c,
                                    ),
                                }))
                              }
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: isCardActive ? '1px solid #fca5a5' : '1px solid #86efac',
                                background: isCardActive ? '#fef2f2' : '#f0fdf4',
                                color: isCardActive ? '#b91c1c' : '#15803d',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title={isCardActive ? 'Sembunyikan kartu ini dari landing page' : 'Tampilkan kembali'}
                            >
                              {isCardActive ? 'Sembunyikan' : 'Aktifkan'}
                            </button>
                          </div>
                        </div>

                        {!isCardActive && (
                          <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600, background: '#fee2e2', padding: '3px 8px', borderRadius: '6px' }}>
                            🚫 Disembunyikan dari Landing Page
                          </div>
                        )}

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                          Judul Kartu
                        </label>
                        <input
                          type="text"
                          value={card.name}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              undanganShowcaseCards:
                                prev.undanganShowcaseCards.map((c, i) =>
                                  i === idx ? { ...c, name: e.target.value } : c,
                                ),
                            }))
                          }
                          style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>
                            Harga Asli / Coret
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={5000}
                            value={card.originalPrice}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                undanganShowcaseCards:
                                  prev.undanganShowcaseCards.map((c, i) =>
                                    i === idx
                                      ? {
                                          ...c,
                                          originalPrice: Math.max(
                                            0,
                                            Math.round(Number(e.target.value) || 0),
                                          ),
                                        }
                                      : c,
                                  ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                            Harga Promo / Jual
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={5000}
                            value={card.price}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                undanganShowcaseCards:
                                  prev.undanganShowcaseCards.map((c, i) =>
                                    i === idx
                                      ? {
                                          ...c,
                                          price: Math.max(
                                            0,
                                            Math.round(Number(e.target.value) || 0),
                                          ),
                                        }
                                      : c,
                                  ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                          Deskripsi Paragraf
                        </label>
                        <textarea
                          rows={2}
                          value={card.description || ''}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              undanganShowcaseCards: prev.undanganShowcaseCards.map((c, i) =>
                                i === idx ? { ...c, description: e.target.value } : c
                              ),
                            }))
                          }
                          placeholder="Deskripsi singkat yang tampil di bawah harga..."
                          style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', resize: 'vertical' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                            Fasilitas (Checklist [✓])
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                undanganShowcaseCards: prev.undanganShowcaseCards.map((c, i) =>
                                  i === idx
                                    ? { ...c, features: [...(c.features || []), 'Poin fasilitas baru'] }
                                    : c
                                ),
                              }))
                            }
                            style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', cursor: 'pointer' }}
                          >
                            + Tambah
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '130px', overflowY: 'auto' }}>
                          {(card.features || []).map((feat, fIdx) => (
                            <div key={fIdx} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <span style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>
                              <input
                                type="text"
                                value={feat}
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    undanganShowcaseCards: prev.undanganShowcaseCards.map((c, i) =>
                                      i === idx
                                        ? {
                                            ...c,
                                            features: (c.features || []).map((f, fi) =>
                                              fi === fIdx ? e.target.value : f
                                            ),
                                          }
                                        : c
                                    ),
                                  }))
                                }
                                style={{ flex: 1, padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    undanganShowcaseCards: prev.undanganShowcaseCards.map((c, i) =>
                                      i === idx
                                        ? { ...c, features: (c.features || []).filter((_, fi) => fi !== fIdx) }
                                        : c
                                    ),
                                  }))
                                }
                                title="Hapus fasilitas"
                                style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.72rem', width: '22px', height: '22px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <StrikethroughPreviewCard
                        label="Pratinjau Kartu:"
                        price={card.price}
                        originalPrice={card.originalPrice}
                      />
                    </div>
                  );
                })}
                </div>
              </section>
            </div>
          </div>

          {/* ── TAB 3: DAFTAR PAKET KUSTOM SUPER ADMIN ── */}
          <div
            role="tabpanel"
            aria-labelledby="pricing-tab-custom"
            hidden={activeTab !== 'custom'}
          >
            <section
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.2rem', color: '#111814' }}>
                    Daftar Paket Kustom Buatan Super Admin
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                    Rancang paket sendiri (misal: Paket VVIP Ballroom 1000 Tamu). Paket ini bisa langsung diterapkan ke pesanan klien dalam 1 klik, atau ikut ditampilkan ke etalase Landing Page.
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="add-custom-preset-btn"
                  onClick={addNewCustomPreset}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #d97706',
                    background: '#fffbeb',
                    color: '#92400e',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  + Buat Paket Kustom Baru
                </button>
              </div>

              {config.customPresets.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '10px',
                    color: '#64748b',
                    fontSize: '0.875rem',
                  }}
                >
                  Belum ada template paket kustom yang disimpan. Klik <strong>&ldquo;+ Buat Paket Kustom Baru&rdquo;</strong> untuk merancang paket khusus Super Admin.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  {config.customPresets.map((preset, idx) => (
                    <div
                      key={preset.id}
                      style={{
                        border: '1px solid #fcd34d',
                        background: '#fffdf7',
                        borderRadius: '12px',
                        padding: '1.15rem',
                        display: 'grid',
                        gap: '0.9rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#78350f' }}>
                          #{idx + 1} · {preset.name || 'Paket Kustom'}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <label style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 600, color: '#0f766e' }}>
                            <input
                              type="checkbox"
                              checked={preset.showOnLanding}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  customPresets: prev.customPresets.map((p, i) =>
                                    i === idx
                                      ? { ...p, showOnLanding: e.target.checked }
                                      : p,
                                  ),
                                }))
                              }
                            />
                            <span>Tampilkan di Landing Page Publik</span>
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.filter(
                                  (_, i) => i !== idx,
                                ),
                              }))
                            }
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #fca5a5',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Hapus Paket
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#78350f', marginBottom: '3px' }}>
                            Nama Paket Kustom
                          </label>
                          <input
                            type="text"
                            value={preset.name}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx ? { ...p, name: e.target.value } : p,
                                ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#78350f', marginBottom: '3px' }}>
                            Tagline
                          </label>
                          <input
                            type="text"
                            value={preset.tagline}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? { ...p, tagline: e.target.value }
                                    : p,
                                ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#78350f', marginBottom: '3px' }}>
                            Kategori Tab Etalase
                          </label>
                          <select
                            value={preset.serviceCategory}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        serviceCategory:
                                          e.target.value === 'UNDANGAN'
                                            ? 'UNDANGAN'
                                            : 'BUKU_TAMU',
                                      }
                                    : p,
                                ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem' }}
                          >
                            <option value="BUKU_TAMU">Buku Tamu Digital (+ Undangan)</option>
                            <option value="UNDANGAN">Undangan Digital Mandiri</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#78350f', marginBottom: '3px' }}>
                            Kuota Tamu Maksimal
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={preset.maxGuests}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        maxGuests: Math.max(
                                          1,
                                          Math.round(Number(e.target.value) || 50),
                                        ),
                                      }
                                    : p,
                                ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#78350f', marginBottom: '3px' }}>
                            Jumlah Petugas (24/hari)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={preset.petugasCount}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        petugasCount: Math.max(
                                          0,
                                          Math.min(100, Number(e.target.value) || 0),
                                        ),
                                      }
                                    : p,
                                ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#78350f', marginBottom: '3px' }}>
                            Harga Asli / Coret (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={10000}
                            value={preset.originalPrice}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        originalPrice: Math.max(
                                          0,
                                          Math.round(Number(e.target.value) || 0),
                                        ),
                                      }
                                    : p,
                                ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#0f172a', marginBottom: '3px' }}>
                            Harga Jual / Deal (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={10000}
                            value={preset.price}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        price: Math.max(
                                          0,
                                          Math.round(Number(e.target.value) || 0),
                                        ),
                                      }
                                    : p,
                                ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.42rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem', fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.8rem', color: '#334155' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={preset.supervisorCount === 1}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? { ...p, supervisorCount: e.target.checked ? 1 : 0 }
                                    : p,
                                ),
                              }))
                            }
                          />
                          <span>Supervisor Lapangan</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={preset.akrilikQris}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? { ...p, akrilikQris: e.target.checked }
                                    : p,
                                ),
                              }))
                            }
                          />
                          <span>Stand Akrilik QRIS</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={preset.gladiH1}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? { ...p, gladiH1: e.target.checked }
                                    : p,
                                ),
                              }))
                            }
                          />
                          <span>Gladi Bersih H-1</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={preset.googleSheetLive}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? { ...p, googleSheetLive: e.target.checked }
                                    : p,
                                ),
                              }))
                            }
                          />
                          <span>Google Sheet Live</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={preset.postEventReport}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? { ...p, postEventReport: e.target.checked }
                                    : p,
                                ),
                              }))
                            }
                          />
                          <span>Laporan Pasca-Acara</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            const est = computeEstimatedPresetPrices(preset);
                            setConfig((prev) => ({
                              ...prev,
                              customPresets: prev.customPresets.map((p, i) =>
                                i === idx
                                  ? {
                                      ...p,
                                      price: est.promoEstimate,
                                      originalPrice: est.normalEstimate,
                                    }
                                  : p,
                              ),
                            }));
                          }}
                          style={{
                            marginLeft: 'auto',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#0f766e',
                            cursor: 'pointer',
                          }}
                        >
                          ⚡ Hitung Estimasi dari Master Tarif
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem', alignItems: 'start' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#78350f', marginBottom: '3px' }}>
                            Poin Fitur Paket (1 baris = 1 fitur)
                          </label>
                          <textarea
                            rows={4}
                            value={preset.features.join('\n')}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                customPresets: prev.customPresets.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        features: e.target.value
                                          .split('\n')
                                          .map((s) => s.trim())
                                          .filter(Boolean),
                                      }
                                    : p,
                                ),
                              }))
                            }
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8rem', fontFamily: 'inherit' }}
                          />
                        </div>

                        <StrikethroughPreviewCard
                          label="Pratinjau Harga Paket Kustom:"
                          price={preset.price}
                          originalPrice={preset.originalPrice}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
