'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RenderTheme, type RendererData } from '../renderers/registry';
import {
  type ClientCustomizationState,
  type CeremonyFormState,
  type StoryFormState,
  type GiftAccountFormState,
  type CustomPhotoSlotKey,
  PATENTED_DESIGN_RULES,
  extractInitialCustomizationState,
  applyClientCustomizationToFixture,
  buildDraftSubmissionPayload,
  buildWhatsappOrderUrl,
  getTemplatePhotoSlotsConfig,
  countSupportedUploadedPhotos,
} from '../customizer/template-customizer';
import './template-customizer-studio.css';

interface TemplateCustomizerStudioProps {
  themeCode: string;
  templateSlug: string;
  templateDisplayName: string;
  templateCategory: string;
  initialFixture: RendererData;
  defaultOpenCustomizer?: boolean;
  adminMode?: boolean;
}

type StudioTab =
  | 'couple'
  | 'schedule'
  | 'story'
  | 'photos'
  | 'words'
  | 'patent';
type ViewportDevice = 'desktop' | 'tablet' | 'mobile';

const MAX_IMAGE_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per photo

async function compressImageToDataUrl(
  file: File,
  maxDimension = 900,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function TemplateCustomizerStudio({
  themeCode,
  templateDisplayName,
  templateCategory,
  initialFixture,
  defaultOpenCustomizer = false,
  adminMode = false,
}: TemplateCustomizerStudioProps) {
  const defaultState = useMemo(
    () => extractInitialCustomizationState(initialFixture),
    [initialFixture],
  );

  const photoSlotsConfig = useMemo(
    () => getTemplatePhotoSlotsConfig(themeCode, initialFixture),
    [themeCode, initialFixture],
  );

  const galleryMaxItems = useMemo(
    () =>
      photoSlotsConfig.find((s) => s.slot === 'gallery')?.maxItems ?? 6,
    [photoSlotsConfig],
  );

  const [state, setState] = useState<ClientCustomizationState>(defaultState);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(defaultOpenCustomizer);
  const [activeTab, setActiveTab] = useState<StudioTab>('couple');
  const [viewportDevice, setViewportDevice] = useState<ViewportDevice>('desktop');
  const [deviceZoom, setDeviceZoom] = useState<number>(85);

  // Order & Admin Submission Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    referenceCode: string;
    whatsappUrl: string;
    savedToServer: boolean;
  } | null>(null);

  // Check URL query ?customize=1 on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('customize') === '1') {
        const timer = setTimeout(() => setDrawerOpen(true), 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Automatically mirror @media (max-width: ...) rules into @container (max-width: ...)
  // so that ANY current or future template CSS automatically responds to the 390px/768px
  // device frame inside TemplateCustomizerStudio even on a wide desktop screen.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const styleId = 'irv-studio-auto-container-rules';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const buildContainerRules = () => {
      const generated: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          // Cross-origin stylesheet (e.g. Google Fonts); skip safely
          continue;
        }
        for (const rule of Array.from(rules)) {
          if (
            typeof CSSMediaRule !== 'undefined' &&
            rule instanceof CSSMediaRule
          ) {
            const cond =
              rule.conditionText || rule.media?.mediaText || '';
            // Match media queries with max-width (e.g. "(max-width: 900px)")
            const match = cond.match(/\(\s*max-width\s*:\s*([0-9.]+(?:px|rem|em))\s*\)/i);
            if (match && !cond.includes('min-width')) {
              const innerCss = Array.from(rule.cssRules)
                .map((r) => r.cssText.replace(/(\d+(?:\.\d+)?)vw\b/g, '$1cqw'))
                .join('\n');
              if (innerCss.trim()) {
                generated.push(`@container (max-width: ${match[1]}) {\n${innerCss}\n}`);
              }
            }
          }
        }
      }
      if (styleEl) {
        styleEl.textContent = generated.join('\n');
      }
    };

    buildContainerRules();
    const timer = window.setTimeout(buildContainerRules, 400);
    return () => window.clearTimeout(timer);
  }, [themeCode, viewportDevice]);

  // Compute live RendererData from client customization state
  const liveFixture = useMemo(
    () => applyClientCustomizationToFixture(initialFixture, state),
    [initialFixture, state],
  );

  const updateField = useCallback(
    <K extends keyof ClientCustomizationState>(
      key: K,
      value: ClientCustomizationState[K],
    ) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateCeremony = useCallback(
    (index: number, patch: Partial<CeremonyFormState>) => {
      setState((prev) => {
        const nextCeremonies = [...prev.ceremonies];
        nextCeremonies[index] = { ...nextCeremonies[index], ...patch };
        return { ...prev, ceremonies: nextCeremonies };
      });
    },
    [],
  );

  const updateGiftAccount = useCallback(
    (index: number, patch: Partial<GiftAccountFormState>) => {
      setState((prev) => {
        const nextAccounts = [...prev.giftAccounts];
        nextAccounts[index] = { ...nextAccounts[index], ...patch };
        return { ...prev, giftAccounts: nextAccounts };
      });
    },
    [],
  );

  const addGiftAccount = useCallback(() => {
    setState((prev) => {
      if (prev.giftAccounts.length >= 2) return prev;
      return {
        ...prev,
        giftAccounts: [
          ...prev.giftAccounts,
          {
            bankName: '',
            accountNumber: '',
            accountHolder: '',
          },
        ],
      };
    });
  }, []);

  const removeGiftAccount = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      giftAccounts: prev.giftAccounts.filter((_, idx) => idx !== index),
    }));
  }, []);

  const updateStory = useCallback(
    (index: number, patch: Partial<StoryFormState>) => {
      setState((prev) => {
        const nextStories = [...prev.stories];
        nextStories[index] = { ...nextStories[index], ...patch };
        return { ...prev, stories: nextStories };
      });
    },
    [],
  );

  const addStory = useCallback(() => {
    setState((prev) => {
      if (prev.stories.length >= 6) return prev;
      return {
        ...prev,
        stories: [
          ...prev.stories,
          {
            year: `${new Date().getFullYear()}`,
            title: `Babak Kisah ${prev.stories.length + 1}`,
            description: '',
          },
        ],
      };
    });
  }, []);

  const removeStory = useCallback((index: number) => {
    setState((prev) => {
      if (prev.stories.length <= 1) return prev;
      return {
        ...prev,
        stories: prev.stories.filter((_, idx) => idx !== index),
      };
    });
  }, []);

  const handleSinglePhotoUpload = async (
    slot: 'hero' | 'closing' | 'bride' | 'groom' | 'story' | 'qris',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      alert(
        `Ukuran foto "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 25 MB.\n\nSilakan pilih foto berukuran di bawah 25 MB.`,
      );
      e.target.value = '';
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const dataUrl = await compressImageToDataUrl(file).catch(() => undefined);

    const stateKey =
      slot === 'hero'
        ? 'heroPhoto'
        : slot === 'closing'
          ? 'closingPhoto'
          : slot === 'bride'
            ? 'bridePhoto'
            : slot === 'groom'
              ? 'groomPhoto'
              : slot === 'qris'
                ? 'qrisPhoto'
                : 'storyPhoto';

    setState((prev) => ({
      ...prev,
      [stateKey]: {
        slot,
        previewUrl: blobUrl,
        dataUrl,
        fileName: file.name,
        order: 0,
      },
    }));
    e.target.value = '';
  };

  const handleGalleryPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const validFiles: File[] = [];
    for (const file of rawFiles) {
      if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
        alert(
          `Ukuran foto "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 25 MB dan dilewati.\n\nSilakan pilih foto di bawah 25 MB.`,
        );
      } else {
        validFiles.push(file);
      }
    }

    const files = validFiles.slice(0, galleryMaxItems);
    if (files.length === 0) {
      e.target.value = '';
      return;
    }

    const newItems = await Promise.all(
      files.map(async (file, idx) => {
        const blobUrl = URL.createObjectURL(file);
        const dataUrl = await compressImageToDataUrl(file).catch(
          () => undefined,
        );
        return {
          slot: 'gallery' as const,
          previewUrl: blobUrl,
          dataUrl,
          fileName: file.name,
          order: idx,
        };
      }),
    );

    setState((prev) => ({
      ...prev,
      galleryPhotos: [...prev.galleryPhotos, ...newItems].slice(
        0,
        galleryMaxItems,
      ),
    }));
    e.target.value = '';
  };

  const handleResetAll = () => {
    setState(extractInitialCustomizationState(initialFixture));
    setSubmittedResult(null);
  };

  const handleSubmitOrderToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientWhatsapp.trim()) {
      setSubmitError('Mohon lengkapi Nama Pemesan dan Nomor WhatsApp Anda.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload = buildDraftSubmissionPayload({
      themeCode,
      clientName,
      clientWhatsapp,
      clientNotes,
      state,
    });

    let referenceCode = `IRV-${Math.random().toString(16).substring(2, 8).toUpperCase()}`;
    let savedToServer = false;

    try {
      let res = await fetch('/api-proxy/events/public/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Fallback retry without photos if payload size exceeds an un-restarted server's body limit
      if (!res.ok && payload.photos.length > 0) {
        res = await fetch('/api-proxy/events/public/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, photos: [] }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data?.referenceCode) {
          referenceCode = data.referenceCode;
        }
        savedToServer = true;
      }
    } catch {
      // Fallback reference code if backend is unreachable in local static preview
      savedToServer = false;
    } finally {
      const whatsappUrl = buildWhatsappOrderUrl({
        referenceCode,
        templateDisplayName,
        themeCode,
        clientName,
        clientWhatsapp,
        clientNotes,
        state,
      });

      setSubmittedResult({
        referenceCode,
        whatsappUrl,
        savedToServer,
      });
      setSubmitting(false);

      if (typeof window !== 'undefined') {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const uploadedPhotoCount = countSupportedUploadedPhotos(
    themeCode,
    state,
    initialFixture,
  );

  return (
    <div
      className={`irv-studio-shell ${drawerOpen ? 'is-drawer-open' : ''}`}
      data-testid="template-customizer-studio"
    >
      {/* ── Top Floating Sandbox Control Bar ── */}
      <header className="irv-studio-bar" role="region" aria-label="Panel Kontrol Simulasi Undangan">
        <div className="irv-studio-bar__left">
          {adminMode ? (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="irv-studio-bar__back"
              style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
            >
              <span aria-hidden="true">←</span>
              <span className="irv-studio-bar__back-text">Kembali</span>
            </button>
          ) : (
            <Link href="/templates" className="irv-studio-bar__back">
              <span aria-hidden="true">←</span>
              <span className="irv-studio-bar__back-text">Katalog</span>
            </Link>
          )}
          <div className="irv-studio-bar__title-group">
            <span className="irv-studio-bar__template-name">
              {templateDisplayName}
            </span>
            <span
              className="irv-studio-bar__sandbox-pill"
              title={adminMode ? "Pratinjau template untuk admin" : "Ini adalah halaman pratinjau simulasi pribadi Anda, bukan tautan undangan publik aktif."}
            >
              {adminMode ? "🔒 Pratinjau Admin" : "🔒 Pratinjau Simulasi"}
            </span>
          </div>
        </div>

        {/* ── Figma-Style Viewport & Scale Switcher ── */}
        <div className="irv-studio-viewport-switcher" role="group" aria-label="Pilih ukuran layar pratinjau">
          <button
            type="button"
            className={`irv-studio-vp-btn ${viewportDevice === 'desktop' ? 'is-active' : ''}`}
            onClick={() => setViewportDevice('desktop')}
            title="Pratinjau Layar Laptop / Desktop (Penuh)"
          >
            <span>🖥️</span>
            <span className="irv-studio-vp-btn__label">Desktop</span>
          </button>
          <button
            type="button"
            className={`irv-studio-vp-btn ${viewportDevice === 'tablet' ? 'is-active' : ''}`}
            onClick={() => {
              setViewportDevice('tablet');
              setDeviceZoom(80);
            }}
            title="Pratinjau Tablet (768 × 920 px)"
          >
            <span>📲</span>
            <span className="irv-studio-vp-btn__label">Tablet</span>
          </button>
          <button
            type="button"
            className={`irv-studio-vp-btn ${viewportDevice === 'mobile' ? 'is-active' : ''}`}
            onClick={() => {
              setViewportDevice('mobile');
              setDeviceZoom(85);
            }}
            title="Pratinjau Layar HP / Smartphone (390 × 812 px)"
          >
            <span>📱</span>
            <span className="irv-studio-vp-btn__label">HP (Mobile)</span>
          </button>

          {viewportDevice !== 'desktop' && (
            <div className="irv-studio-zoom-group" aria-label="Skala Zoom Layar">
              {[75, 85, 100].map((zoomVal) => (
                <button
                  key={zoomVal}
                  type="button"
                  className={`irv-studio-zoom-btn ${deviceZoom === zoomVal ? 'is-active' : ''}`}
                  onClick={() => setDeviceZoom(zoomVal)}
                  title={`Zoom ${zoomVal}%`}
                >
                  {zoomVal}%
                </button>
              ))}
            </div>
          )}
        </div>

        {!adminMode && (
        <div className="irv-studio-bar__actions">
          <button
            type="button"
            id="btn-toggle-customizer"
            className={`irv-studio-btn irv-studio-btn--customize ${drawerOpen ? 'is-active' : ''}`}
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-label={drawerOpen ? 'Tutup Panel Kustomisasi' : 'Buka Panel Kustomisasi Data & Foto'}
          >
            <span className="irv-studio-btn__label-full">{drawerOpen ? '✕ Tutup Panel' : 'Ubah Data & Foto'}</span>
            <span className="irv-studio-btn__label-short">{drawerOpen ? '✕ Tutup' : 'Ubah Data'}</span>
          </button>

          <button
            type="button"
            id="btn-open-submit-draft-modal"
            className="irv-studio-btn irv-studio-btn--submit"
            onClick={() => {
              setSubmittedResult(null);
              setSubmitError(null);
              setShowOrderModal(true);
            }}
            aria-label="Pesan Undangan Sekarang"
          >
            <span className="irv-studio-btn__label-full">Pesan Sekarang →</span>
            <span className="irv-studio-btn__label-short">Pesan →</span>
          </button>
        </div>
        )}
      </header>

      {/* ── Interactive Side Drawer ── */}
      {!adminMode && (
      <aside
        className={`irv-studio-drawer ${drawerOpen ? 'is-open' : ''}`}
        aria-label="Editor Personalisasi Klien"
      >
        <div className="irv-studio-drawer__header">
          <div className="irv-studio-drawer__header-top">
            <h2 className="irv-studio-drawer__title">
              Studio Simulasi • {templateDisplayName}
            </h2>
            <button
              type="button"
              className="irv-studio-drawer__reset-btn"
              onClick={handleResetAll}
              title="Kembalikan ke data contoh bawaan"
            >
              ↺ Kembalikan Semula
            </button>
          </div>
          <p className="irv-studio-drawer__subtitle">
            Sesuaikan nama, jadwal, dan foto untuk melihat simulasi undangan secara real-time. Format tampilan tetap tertata rapi sesuai standar desain <strong>IRVITE</strong>.
          </p>
        </div>

        {/* Drawer Navigation Tabs */}
        <div className="irv-studio-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'couple'}
            className={`irv-studio-tab ${activeTab === 'couple' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('couple')}
          >
            👰 Mempelai
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'schedule'}
            className={`irv-studio-tab ${activeTab === 'schedule' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            📅 Acara
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'story'}
            className={`irv-studio-tab ${activeTab === 'story' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('story')}
          >
            📜 Kisah Cinta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'photos'}
            className={`irv-studio-tab ${activeTab === 'photos' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            🖼️ Foto ({uploadedPhotoCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'words'}
            className={`irv-studio-tab ${activeTab === 'words' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('words')}
          >
            💌 Kata & Doa
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'patent'}
            className={`irv-studio-tab ${activeTab === 'patent' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('patent')}
          >
            📋 Ketentuan
          </button>
        </div>

        {/* Drawer Body */}
        <div className="irv-studio-drawer__body">
          {/* TAB 1: COUPLE */}
          {activeTab === 'couple' && (
            <>
              <div className="irv-studio-section-banner">
                ✨ Ketik nama panggilan dan nama lengkap Anda. Tampilan sampul dan profil mempelai di layar pratinjau akan langsung berubah otomatis.
              </div>

              <div className="irv-studio-card-group">
                <h3 className="irv-studio-card-group__title">
                  <span>Mempelai Wanita (Pasangan 1)</span>
                </h3>
                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Nama Panggilan</span>
                    <span className="irv-studio-label__hint">Tampil di Sampul</span>
                  </label>
                  <input
                    type="text"
                    className="irv-studio-input"
                    maxLength={40}
                    value={state.partnerOneName}
                    onKeyDown={(e) => {
                      if (/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => updateField('partnerOneName', e.target.value.replace(/[0-9]/g, ''))}
                    placeholder="Contoh: Nara"
                  />
                </div>
                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Nama Lengkap & Gelar</span>
                  </label>
                  <input
                    type="text"
                    className="irv-studio-input"
                    maxLength={120}
                    value={state.partnerOneFullName}
                    onChange={(e) => updateField('partnerOneFullName', e.target.value)}
                    placeholder="Contoh: Rr. Nara Pramudita, S.Sn."
                  />
                </div>
                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Keluarga / Nama Orang Tua</span>
                  </label>
                  <textarea
                    className="irv-studio-textarea"
                    rows={2}
                    maxLength={250}
                    value={state.partnerOneFamily}
                    onChange={(e) => updateField('partnerOneFamily', e.target.value)}
                    placeholder="Putri dari Bapak ... & Ibu ..."
                  />
                </div>
              </div>

              <div className="irv-studio-card-group">
                <h3 className="irv-studio-card-group__title">
                  <span>Mempelai Pria (Pasangan 2)</span>
                </h3>
                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Nama Panggilan</span>
                    <span className="irv-studio-label__hint">Tampil di Sampul</span>
                  </label>
                  <input
                    type="text"
                    className="irv-studio-input"
                    maxLength={40}
                    value={state.partnerTwoName}
                    onKeyDown={(e) => {
                      if (/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => updateField('partnerTwoName', e.target.value.replace(/[0-9]/g, ''))}
                    placeholder="Contoh: Arka"
                  />
                </div>
                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Nama Lengkap & Gelar</span>
                  </label>
                  <input
                    type="text"
                    className="irv-studio-input"
                    maxLength={120}
                    value={state.partnerTwoFullName}
                    onChange={(e) => updateField('partnerTwoFullName', e.target.value)}
                    placeholder="Contoh: Rm. Arka Suryaningrat, M.Ars."
                  />
                </div>
                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Keluarga / Nama Orang Tua</span>
                  </label>
                  <textarea
                    className="irv-studio-textarea"
                    rows={2}
                    maxLength={250}
                    value={state.partnerTwoFamily}
                    onChange={(e) => updateField('partnerTwoFamily', e.target.value)}
                    placeholder="Putra dari Bapak ... & Ibu ..."
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SCHEDULE & VENUE */}
          {activeTab === 'schedule' && (
            <>
              <div className="irv-studio-section-banner">
                📅 Atur tanggal, jam, dan lokasi acara. Hitung mundur (countdown) di undangan akan otomatis menyesuaikan dengan jadwal Anda.
              </div>

              <div className="irv-studio-field">
                <label className="irv-studio-label">Zona Waktu Indonesia</label>
                <select
                  className="irv-studio-select"
                  value={state.timeZone}
                  onChange={(e) =>
                    updateField(
                      'timeZone',
                      e.target.value as 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura',
                    )
                  }
                >
                  <option value="Asia/Jakarta">WIB (Waktu Indonesia Barat)</option>
                  <option value="Asia/Makassar">WITA (Waktu Indonesia Tengah)</option>
                  <option value="Asia/Jayapura">WIT (Waktu Indonesia Timur)</option>
                </select>
              </div>

              {state.ceremonies.map((ceremony, idx) => (
                <div key={idx} className="irv-studio-card-group">
                  <h3 className="irv-studio-card-group__title">
                    <span>Rangkaian Acara #{idx + 1}</span>
                    {state.ceremonies.length > 1 && (
                      <button
                        type="button"
                        className="irv-studio-remove-btn"
                        style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                        onClick={() =>
                          updateField(
                            'ceremonies',
                            state.ceremonies.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        Hapus
                      </button>
                    )}
                  </h3>

                  <div className="irv-studio-field">
                    <label className="irv-studio-label">Nama Acara</label>
                    <input
                      type="text"
                      className="irv-studio-input"
                      maxLength={80}
                      value={ceremony.title}
                      onChange={(e) =>
                        updateCeremony(idx, { title: e.target.value })
                      }
                      placeholder={idx === 0 ? 'Akad Nikah / Pemberkatan' : 'Resepsi Pernikahan'}
                    />
                  </div>

                  <div className="irv-studio-field">
                    <label className="irv-studio-label">Waktu Mulai</label>
                    <input
                      type="datetime-local"
                      className="irv-studio-input"
                      value={ceremony.startDateTime}
                      onChange={(e) =>
                        updateCeremony(idx, { startDateTime: e.target.value })
                      }
                    />
                  </div>

                  <div className="irv-studio-field">
                    <label className="irv-studio-label">Waktu Selesai</label>
                    <input
                      type="datetime-local"
                      className="irv-studio-input"
                      value={ceremony.endDateTime}
                      onChange={(e) =>
                        updateCeremony(idx, { endDateTime: e.target.value })
                      }
                    />
                  </div>

                  <div className="irv-studio-field">
                    <label className="irv-studio-label">Nama Gedung / Tempat</label>
                    <input
                      type="text"
                      className="irv-studio-input"
                      maxLength={150}
                      value={ceremony.venue}
                      onChange={(e) =>
                        updateCeremony(idx, { venue: e.target.value })
                      }
                      placeholder="Contoh: Pendopo Agung / The Glasshouse"
                    />
                  </div>

                  <div className="irv-studio-field">
                    <label className="irv-studio-label">Alamat Lengkap</label>
                    <textarea
                      className="irv-studio-textarea"
                      rows={2}
                      maxLength={300}
                      value={ceremony.address}
                      onChange={(e) =>
                        updateCeremony(idx, { address: e.target.value })
                      }
                      placeholder="Jl. ..."
                    />
                  </div>

                  <div className="irv-studio-field">
                    <label className="irv-studio-label">
                      <span>Tautan Google Maps (Opsional)</span>
                    </label>
                    <input
                      type="url"
                      className="irv-studio-input"
                      value={ceremony.mapsUrl}
                      onChange={(e) =>
                        updateCeremony(idx, { mapsUrl: e.target.value })
                      }
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                </div>
              ))}

              {state.ceremonies.length < 2 && (
                <button
                  type="button"
                  className="irv-studio-drawer__reset-btn"
                  style={{ padding: '9px', width: '100%' }}
                  onClick={() =>
                    updateField('ceremonies', [
                      ...state.ceremonies,
                      {
                        title: 'Resepsi Pernikahan',
                        startDateTime:
                          state.ceremonies[0]?.startDateTime || '2026-10-18T11:00',
                        endDateTime: '2026-10-18T14:00',
                        venue: state.ceremonies[0]?.venue || 'Lokasi Resepsi',
                        address: state.ceremonies[0]?.address || '',
                        mapsUrl: state.ceremonies[0]?.mapsUrl || '',
                      },
                    ])
                  }
                >
                  + Tambah Sesi Acara Kedua (Resepsi)
                </button>
              )}
            </>
          )}

          {/* TAB: STORY / KISAH CINTA */}
          {activeTab === 'story' && (
            <>
              <div className="irv-studio-section-banner">
                📜 Susun rangkuman perjalanan cinta Anda dalam babak-babak kisah penuh kenangan. Setiap perubahan teks dan tahun akan langsung tampil di linimasa pratinjau.
              </div>

              {state.stories.map((item, idx) => (
                <div key={idx} className="irv-studio-card-group">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <h3
                      className="irv-studio-card-group__title"
                      style={{ margin: 0 }}
                    >
                      <span>Babak {idx + 1}</span>
                    </h3>
                    {state.stories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStory(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          padding: '2px 6px',
                        }}
                      >
                        ✕ Hapus
                      </button>
                    )}
                  </div>

                  <div className="irv-studio-field">
                    <label className="irv-studio-label">
                      <span>Tahun / Momen Waktu</span>
                      <span className="irv-studio-label__hint">
                        Contoh: 2022 atau 14 Feb 2022
                      </span>
                    </label>
                    <input
                      type="text"
                      className="irv-studio-input"
                      maxLength={30}
                      value={item.year}
                      onChange={(e) =>
                        updateStory(idx, { year: e.target.value })
                      }
                      placeholder="Contoh: 2022"
                    />
                  </div>

                  <div className="irv-studio-field">
                    <label className="irv-studio-label">
                      <span>Judul Babak</span>
                    </label>
                    <input
                      type="text"
                      className="irv-studio-input"
                      maxLength={70}
                      value={item.title}
                      onChange={(e) =>
                        updateStory(idx, { title: e.target.value })
                      }
                      placeholder="Contoh: Pertemuan Pertama"
                    />
                  </div>

                  <div className="irv-studio-field">
                    <label className="irv-studio-label">
                      <span>Kisah & Cerita Singkat</span>
                      <span className="irv-studio-label__hint">
                        {item.description.length}/350
                      </span>
                    </label>
                    <textarea
                      className="irv-studio-textarea"
                      rows={3}
                      maxLength={350}
                      value={item.description}
                      onChange={(e) =>
                        updateStory(idx, { description: e.target.value })
                      }
                      placeholder="Tuliskan kisah singkat perjalanan cinta pada babak ini..."
                    />
                  </div>
                </div>
              ))}

              {state.stories.length < 6 && (
                <button
                  type="button"
                  className="irv-studio-drawer__reset-btn"
                  style={{ padding: '9px', width: '100%', marginTop: '6px' }}
                  onClick={addStory}
                >
                  + Tambah Babak Kisah Cinta
                </button>
              )}
            </>
          )}

          {/* TAB 3: PHOTOS */}
          {activeTab === 'photos' && (
            <>
              <div className="irv-studio-section-banner">
                🖼️ Template <strong>{templateDisplayName}</strong> menyediakan{' '}
                <strong>{photoSlotsConfig.length} bagian foto</strong> sesuai
                tata letak aslinya. Unggah foto Anda untuk melihat pratinjau
                langsung dan mengirimkannya ke Dashboard Super Admin!
              </div>

              {photoSlotsConfig.map((slotCfg, idx) => {
                const slotNumber = idx + 1;

                if (slotCfg.slot === 'gallery') {
                  return (
                    <div key={slotCfg.slot} className="irv-studio-photo-box">
                      <div className="irv-studio-label">
                        <span>
                          {slotNumber}. {slotCfg.title}
                        </span>
                        <span className="irv-studio-label__hint">
                          {state.galleryPhotos.length}/{slotCfg.maxItems} Foto •{' '}
                          {slotCfg.hint}
                        </span>
                      </div>

                      {state.galleryPhotos.length > 0 && (
                        <div className="irv-studio-gallery-grid">
                          {state.galleryPhotos
                            .slice(0, slotCfg.maxItems)
                            .map((item, gIdx) => (
                              <div
                                key={gIdx}
                                className="irv-studio-gallery-item"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.previewUrl}
                                  alt={`Galeri Klien ${gIdx + 1}`}
                                />
                                <button
                                  type="button"
                                  title="Hapus foto ini"
                                  onClick={() =>
                                    updateField(
                                      'galleryPhotos',
                                      state.galleryPhotos.filter(
                                        (_, i) => i !== gIdx,
                                      ),
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                        </div>
                      )}

                      <div className="irv-studio-photo-actions">
                        {state.galleryPhotos.length < slotCfg.maxItems && (
                          <label className="irv-studio-upload-btn">
                            <span>{slotCfg.uploadButtonLabel}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                              multiple
                              style={{ display: 'none' }}
                              onChange={handleGalleryPhotoUpload}
                            />
                          </label>
                        )}
                        {state.galleryPhotos.length > 0 && (
                          <button
                            type="button"
                            className="irv-studio-remove-btn"
                            onClick={() => updateField('galleryPhotos', [])}
                          >
                            {slotCfg.resetButtonLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                const singleSlot = slotCfg.slot as Exclude<
                  CustomPhotoSlotKey,
                  'gallery'
                >;
                const stateKey =
                  singleSlot === 'hero'
                    ? 'heroPhoto'
                    : singleSlot === 'bride'
                      ? 'bridePhoto'
                      : singleSlot === 'groom'
                        ? 'groomPhoto'
                        : singleSlot === 'story'
                          ? 'storyPhoto'
                          : 'closingPhoto';

                const currentPhoto = state[stateKey];
                const dynamicTitle =
                  singleSlot === 'bride'
                    ? `${slotCfg.title} (${state.partnerOneName || 'Mempelai Wanita'})`
                    : singleSlot === 'groom'
                      ? `${slotCfg.title} (${state.partnerTwoName || 'Mempelai Pria'})`
                      : slotCfg.title;

                return (
                  <div key={slotCfg.slot} className="irv-studio-photo-box">
                    <div className="irv-studio-label">
                      <span>
                        {slotNumber}. {dynamicTitle}
                      </span>
                      <span className="irv-studio-label__hint">
                        {slotCfg.hint}
                      </span>
                    </div>
                    {currentPhoto && (
                      <div className="irv-studio-photo-preview-row">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentPhoto.previewUrl}
                          alt={`Pratinjau ${slotCfg.title}`}
                          className="irv-studio-photo-thumb"
                        />
                        <div style={{ fontSize: '0.76rem', color: '#394640' }}>
                          <strong>
                            {currentPhoto.fileName || slotCfg.title}
                          </strong>
                          <div>{slotCfg.description}</div>
                        </div>
                      </div>
                    )}
                    <div className="irv-studio-photo-actions">
                      <label className="irv-studio-upload-btn">
                        <span>{slotCfg.uploadButtonLabel}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          style={{ display: 'none' }}
                          onChange={(e) =>
                            handleSinglePhotoUpload(singleSlot, e)
                          }
                        />
                      </label>
                      {currentPhoto && (
                        <button
                          type="button"
                          className="irv-studio-remove-btn"
                          onClick={() => updateField(stateKey, null)}
                        >
                          {slotCfg.resetButtonLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* TAB 4: WORDS, PRAYER & GIFTS */}
          {activeTab === 'words' && (
            <>
              <div className="irv-studio-section-banner">
                💌 Sesuaikan kutipan romantis, kalimat pengantar undangan, doa pernikahan, dan rekening tanda kasih.
              </div>

              <div className="irv-studio-card-group">
                <h3 className="irv-studio-card-group__title">
                  <span>Untaian Kata & Doa</span>
                </h3>

                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Kutipan Cinta / Statement</span>
                  </label>
                  <textarea
                    className="irv-studio-textarea"
                    rows={2}
                    maxLength={255}
                    value={state.quoteText}
                    onChange={(e) => updateField('quoteText', e.target.value)}
                  />
                  <div className="irv-studio-counter">
                    {state.quoteText.length} / 255 karakter
                  </div>
                </div>

                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Kalimat Pembuka Undangan</span>
                  </label>
                  <textarea
                    className="irv-studio-textarea"
                    rows={3}
                    maxLength={255}
                    value={state.openingText}
                    onChange={(e) => updateField('openingText', e.target.value)}
                  />
                  <div className="irv-studio-counter">
                    {state.openingText.length} / 255 karakter
                  </div>
                </div>

                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Doa / Ayat Suci Pernikahan</span>
                  </label>
                  <textarea
                    className="irv-studio-textarea"
                    rows={3}
                    maxLength={255}
                    value={state.prayerText}
                    onChange={(e) => updateField('prayerText', e.target.value)}
                  />
                  <div className="irv-studio-counter">
                    {state.prayerText.length} / 255 karakter
                  </div>
                </div>

                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Kalimat Penutup & Ucapan Terima Kasih</span>
                  </label>
                  <textarea
                    className="irv-studio-textarea"
                    rows={3}
                    maxLength={255}
                    value={state.closingText}
                    onChange={(e) => updateField('closingText', e.target.value)}
                  />
                  <div className="irv-studio-counter">
                    {state.closingText.length} / 255 karakter
                  </div>
                </div>
              </div>

              <div className="irv-studio-card-group">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <h3 className="irv-studio-card-group__title" style={{ margin: 0 }}>
                    <span>Nomor Rekening Bank (Bisa 1 atau 2 Rekening)</span>
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: state.giftAccounts.length >= 2 ? '#b45309' : '#475569',
                      background: state.giftAccounts.length >= 2 ? '#fef3c7' : '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {state.giftAccounts.length} / 2 Rekening
                  </span>
                </div>

                {state.giftAccounts.length === 0 ? (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      background: '#fdfbf7',
                      border: '1px dashed #d6cbba',
                      fontSize: '12px',
                      color: '#665b4c',
                      textAlign: 'center',
                      lineHeight: 1.5,
                    }}
                  >
                    Belum ada nomor rekening bank yang ditambahkan. Anda dapat menambahkan 1 atau 2 rekening bank transfer, atau cukup menggunakan Barcode QRIS di bawah.
                  </div>
                ) : (
                  state.giftAccounts.map((acc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '12px',
                        background: '#fdfbf7',
                        borderRadius: '8px',
                        border: '1px solid #e8e2d5',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#8c6527',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Rekening #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeGiftAccount(idx)}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#b91c1c',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            cursor: 'pointer',
                          }}
                          aria-label={`Hapus rekening ${idx + 1}`}
                        >
                          Hapus Rekening
                        </button>
                      </div>

                      <div className="irv-studio-field-row">
                        <div className="irv-studio-field">
                          <label className="irv-studio-label">Nama Bank</label>
                          <input
                            type="text"
                            className="irv-studio-input"
                            value={acc.bankName}
                            onChange={(e) =>
                              updateGiftAccount(idx, { bankName: e.target.value })
                            }
                            placeholder="Contoh: BCA / Mandiri / BRI"
                          />
                        </div>
                        <div className="irv-studio-field">
                          <label className="irv-studio-label">No. Rekening</label>
                          <input
                            type="text"
                            className="irv-studio-input"
                            value={acc.accountNumber}
                            onChange={(e) =>
                              updateGiftAccount(idx, {
                                accountNumber: e.target.value,
                              })
                            }
                            placeholder="1234567890"
                          />
                        </div>
                      </div>
                      <div className="irv-studio-field">
                        <label className="irv-studio-label">Atas Nama (Pemilik)</label>
                        <input
                          type="text"
                          className="irv-studio-input"
                          value={acc.accountHolder}
                          onChange={(e) =>
                            updateGiftAccount(idx, {
                              accountHolder: e.target.value,
                            })
                          }
                          placeholder="Nama Lengkap Pemilik Rekening"
                        />
                      </div>
                    </div>
                  ))
                )}

                {state.giftAccounts.length < 2 && (
                  <button
                    type="button"
                    onClick={addGiftAccount}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#1b4332',
                      background: '#f0fdf4',
                      border: '1px dashed #86efac',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>+ Tambah Rekening {state.giftAccounts.length === 0 ? 'Pertama' : 'Kedua'} (Maks. 2)</span>
                  </button>
                )}

                {/* Barcode QRIS Upload */}
                <div
                  style={{
                    marginTop: '8px',
                    paddingTop: '12px',
                    borderTop: '1px dashed #e2ddd3',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <label className="irv-studio-label">
                    <span>Barcode QRIS Amplop Digital (Opsional)</span>
                    <span className="irv-studio-label-hint">
                      Scan Semua Bank &amp; e-Wallet
                    </span>
                  </label>

                  {state.qrisPhoto ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1px solid #d4c4a8',
                        background: '#fdfbf7',
                      }}
                    >
                      <img
                        src={state.qrisPhoto.previewUrl}
                        alt="Pratinjau QRIS"
                        style={{
                          width: '64px',
                          height: '64px',
                          objectFit: 'contain',
                          background: '#fff',
                          borderRadius: '6px',
                          border: '1px solid #e5e0d5',
                          padding: '4px',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#2c251d',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {state.qrisPhoto.fileName || 'Barcode QRIS Terpasang'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#7a6f62', marginTop: '2px' }}>
                          Tampil di seksi Amplop Digital &amp; siap untuk Pajangan Meja
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField('qrisPhoto', null)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#b91c1c',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          padding: '5px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  ) : null}

                  <label className="irv-studio-upload-zone">
                    <span className="irv-studio-upload-btn">
                      {state.qrisPhoto
                        ? '🔄 Ganti Gambar Barcode QRIS'
                        : '📲 Unggah Gambar Barcode QRIS'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#7a6f62' }}>
                      Tamu dapat langsung scan atau mengunduh QRIS dari undangan
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => handleSinglePhotoUpload('qris', e)}
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          {/* TAB 5: PATENTED / LOCKED DESIGN */}
          {activeTab === 'patent' && (
            <>
              <div className="irv-studio-section-banner">
                📋 Untuk menjaga kualitas visual setara undangan editorial mewah, elemen struktur dan artistik di bawah ini <strong>merupakan ketentuan desain baku</strong> dari tim <strong>IRVITE</strong> dan tidak dapat diubah.
              </div>

              {PATENTED_DESIGN_RULES.map((rule) => (
                <div key={rule.id} className="irv-studio-patent-card">
                  <div className="irv-studio-patent-card__top">
                    <span className="irv-studio-patent-card__title">
                      {rule.title}
                    </span>
                    <span className="irv-studio-patent-badge">
                      📋 Ketentuan Desain
                    </span>
                  </div>
                  <p className="irv-studio-patent-card__desc">
                    {rule.description}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Drawer Footer CTA */}
        <div className="irv-studio-drawer__footer">
          <button
            type="button"
            className="irv-studio-drawer__footer-cta"
            onClick={() => {
              setSubmittedResult(null);
              setSubmitError(null);
              setShowOrderModal(true);
            }}
          >
            Cocok dengan Tampilan Ini? Pesan Sekarang →
          </button>
        </div>
      </aside>
      )}

      {/* ── Live Preview Stage (Figma-Style Canvas & Device Frame) ── */}
      <div className={`irv-studio-preview-stage is-device-${viewportDevice}`}>
        {viewportDevice !== 'desktop' && (
          <div className="irv-studio-canvas-hud">
            <span className="irv-studio-canvas-hud__badge">
              {viewportDevice === 'mobile'
                ? '📱 iPhone / Smartphone • 390 × 812 px'
                : '📲 iPad / Tablet • 768 × 920 px'}
            </span>
            <span className="irv-studio-canvas-hud__hint">
              Scroll di dalam layar perangkat untuk menjelajahi undangan
            </span>
          </div>
        )}

        <div
          className={`irv-studio-device-shell is-device-${viewportDevice}`}
          style={
            viewportDevice !== 'desktop'
              ? {
                  transform: `scale(${deviceZoom / 100})`,
                  transformOrigin: 'top center',
                }
              : undefined
          }
        >
          {viewportDevice === 'mobile' && (
            <div className="irv-studio-phone-notch" aria-hidden="true">
              <span className="irv-studio-phone-camera" />
            </div>
          )}
          <div className={`irv-studio-device-frame is-device-${viewportDevice}`}>
            <div className="irv-studio-device-scroller">
              <RenderTheme
                themeCode={themeCode}
                data={liveFixture}
                uniqueCode=""
                isPreview={true}
                mode="PUBLIC"
              />
            </div>
          </div>
          {viewportDevice === 'mobile' && (
            <div className="irv-studio-phone-homebar" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* ── Submit to Super Admin & WhatsApp Modal ── */}
      {!adminMode && showOrderModal && (
        <div
          className="irv-studio-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-order-modal-title"
        >
          <div className="irv-studio-modal">
            <div className="irv-studio-modal__header">
              <div>
                <h2 id="studio-order-modal-title" className="irv-studio-modal__title">
                  Kirim Draf Personalisasi ke Admin IRVITE
                </h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#59655f' }}>
                  Data dan foto yang Anda sesuaikan akan masuk ke Dashboard Super Admin sebagai draf pesanan dan diteruskan ke WhatsApp Admin.
                </p>
              </div>
              <button
                type="button"
                className="irv-studio-modal__close"
                onClick={() => setShowOrderModal(false)}
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            {/* Summary of Client's Customized Data */}
            <div className="irv-studio-summary-box">
              <div className="irv-studio-summary-item">
                <span>Template Pilihan</span>
                <strong>
                  {templateDisplayName} ({templateCategory})
                </strong>
              </div>
              <div className="irv-studio-summary-item">
                <span>Nama Mempelai</span>
                <strong>
                  {state.partnerOneName || 'Mempelai 1'} &amp;{' '}
                  {state.partnerTwoName || 'Mempelai 2'}
                </strong>
              </div>
              <div className="irv-studio-summary-item">
                <span>Jadwal Utama</span>
                <strong>
                  {state.ceremonies[0]?.startDateTime
                    ? state.ceremonies[0].startDateTime.replace('T', ' • ')
                    : '-'}
                </strong>
              </div>
              <div className="irv-studio-summary-item">
                <span>Foto Simulasi Terlampir</span>
                <strong>{uploadedPhotoCount} Foto Siap Dikirim</strong>
              </div>
            </div>

            {!submittedResult ? (
              <form
                onSubmit={handleSubmitOrderToAdmin}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {submitError && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: '0.8rem',
                    }}
                  >
                    ⚠️ {submitError}
                  </div>
                )}

                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Nama Lengkap Pemesan *</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="irv-studio-input"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Masukkan nama Anda"
                  />
                </div>

                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Nomor WhatsApp Aktif *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    className="irv-studio-input"
                    value={clientWhatsapp}
                    onChange={(e) => setClientWhatsapp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                  />
                </div>

                <div className="irv-studio-field">
                  <label className="irv-studio-label">
                    <span>Catatan Tambahan untuk Admin (Opsional)</span>
                  </label>
                  <textarea
                    className="irv-studio-textarea"
                    rows={2}
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="Contoh: Mohon gunakan lagu instrumental Jawa / request warna amplop..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="irv-studio-drawer__footer-cta"
                  style={{ marginTop: '4px' }}
                >
                  {submitting
                    ? 'Menyimpan ke Dashboard Admin...'
                    : '🚀 Simpan Draf & Lanjut ke WhatsApp Admin'}
                </button>
              </form>
            ) : (
              <div className="irv-studio-success-box">
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  ✅ Draf Undangan Anda Berhasil Disiapkan!
                </div>
                <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Kode Draf Dashboard Super Admin:{' '}
                  <strong
                    style={{
                      background: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #6ee7b7',
                    }}
                  >
                    #{submittedResult.referenceCode}
                  </strong>
                  <br />
                  {submittedResult.savedToServer
                    ? 'Data pernikahan & foto Anda telah tersimpan otomatis di Dashboard Super Admin IRVITE dengan status DRAFT.'
                    : 'Ringkasan data pernikahan Anda telah diformat otomatis untuk dikirimkan ke WhatsApp Admin IRVITE.'}
                </div>

                <a
                  href={submittedResult.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="irv-studio-drawer__footer-cta"
                  style={{
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  💬 Buka Chat WhatsApp Admin Sekarang →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

