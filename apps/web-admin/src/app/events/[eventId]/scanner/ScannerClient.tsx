'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { parseQRData } from '../../../../utils/qr-parser';
import './scanner.css';

interface ScannerClientProps {
  eventId: string;
  trustedOrigin: string;
}

type ScanStatus = 'INITIALIZING' | 'READY' | 'ERROR' | 'DENIED' | 'NOT_FOUND';
type ScanState = 'IDLE' | 'RESOLVING' | 'PREVIEW' | 'CHECKING_IN' | 'CHECKED_IN' | 'ALREADY_CHECKED_IN';

interface CheckInAudit {
  id: string;
  scannedPax: number;
  scannedAt: string;
  scannedById: string;
}

function triggerScanFeedback() {
  // 1. Haptic vibration feedback on mobile
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(60);
    }
  } catch {}

  // 2. Audio feedback chime (C6 note crisp beep)
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    }
  } catch {}
}


interface EventBanner {
  title: string;
  eventDate?: string | null;
  locationDetails?: string | null;
  partnerOneName?: string | null;
  partnerTwoName?: string | null;
  templateName?: string | null;
  coverImageUrl?: string | null;
}

/** Maps a template cover URL into a safe, same-origin-renderable image src. */
function resolveCoverSrc(url?: string | null): string | null {
  if (!url) return null;
  const imported = url.match(/^\/templates\/assets\/([0-9a-f-]{36})\/file$/i);
  if (imported) return `/api/template-assets/${imported[1]}`;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (/^https:\/\//i.test(url)) return url;
  return null;
}

const CATEGORY_LABELS: Record<string, string> = {
  REGULAR: 'Reguler',
  VIP: 'VIP',
  VVIP: 'VVIP',
  FAMILY: 'Keluarga',
  FRIEND: 'Teman',
  COLLEAGUE: 'Rekan Kerja',
};

function formatCategory(category?: string | null): string | null {
  if (!category) return null;
  const key = category.trim().toUpperCase();
  return CATEGORY_LABELS[key] || category.trim();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function EventBannerView({ banner }: { banner: EventBanner | null }) {
  const cover = resolveCoverSrc(banner?.coverImageUrl);
  const p1 = banner?.partnerOneName;
  const p2 = banner?.partnerTwoName;
  const hasCouple = Boolean(p1 && p2);
  const headline = hasCouple ? `${p1} & ${p2}` : p1 || banner?.title || '';
  const dateLabel = banner?.eventDate
    ? new Date(banner.eventDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className={`scan-banner${banner ? '' : ' scan-banner--loading'}`}>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="scan-banner__img" src={cover} alt="" draggable={false} />
      )}
      <div className="scan-banner__shade" />
      <span className="scan-banner__brand">IRVITE</span>
      <div className="scan-banner__content">
        {banner ? (
          <>
            <span className="scan-banner__eyebrow">{hasCouple ? 'The Wedding of' : 'Acara'}</span>
            <h3 className="scan-banner__names">{headline}</h3>
            {hasCouple && banner.title && banner.title !== headline && (
              <p className="scan-banner__title">{banner.title}</p>
            )}
            {(dateLabel || banner.locationDetails) && (
              <p className="scan-banner__meta">
                {dateLabel}
                {dateLabel && banner.locationDetails ? ' · ' : ''}
                {banner.locationDetails}
              </p>
            )}
          </>
        ) : (
          <>
            <span className="scan-skeleton scan-skeleton--sm" />
            <span className="scan-skeleton scan-skeleton--lg" />
            <span className="scan-skeleton scan-skeleton--md" />
          </>
        )}
      </div>
    </div>
  );
}

function CheckInHistory({ items, title }: { items?: CheckInAudit[]; title: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="scan-history">
      <p className="scan-history__title">{title}</p>
      <ul>
        {items.map((ci) => (
          <li key={ci.id}>
            <span>{formatTime(ci.scannedAt)}</span>
            <span>+{ci.scannedPax} pax</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ResolveData {
  result: 'READY' | 'ALREADY_CHECKED_IN';
  status?: 'NOT_CHECKED_IN' | 'PARTIAL' | 'COMPLETE';
  scannedPax?: number;
  remainingPax?: number;
  guest: { name: string; maxPax: number; category?: string | null; customGreeting?: string | null };
  event?: EventBanner | null;
  rsvp?: { response: string; pax?: number | null };
  attendance?: { scannedPax: number; scannedAt: string } | null;
  checkIns?: CheckInAudit[];
}

interface CheckInResponse {
  result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN';
  status?: 'PARTIAL' | 'COMPLETE';
  scannedPax?: number;
  remainingPax?: number;
  deltaPax?: number;
  attendance?: {
    scannedPax: number;
    scannedAt: string;
  };
}

interface LastCheckInResult {
  deltaPax: number;
  scannedPax: number;
  remainingPax: number;
  maxPax: number;
  status: 'PARTIAL' | 'COMPLETE';
  scannedAt: string;
}

export default function ScannerClient({ eventId, trustedOrigin }: ScannerClientProps) {
  const router = useRouter();

  // Camera State
  const [scanStatus, setScanStatus] = useState<ScanStatus>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Logic State
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [rawCode, setRawCode] = useState<string>('');
  const [resolveData, setResolveData] = useState<ResolveData | null>(null);
  const [selectedPax, setSelectedPax] = useState<number>(1);
  const [manualInput, setManualInput] = useState<string>('');
  const [lastCheckInResult, setLastCheckInResult] = useState<LastCheckInResult | null>(null);
  const [eventBanner, setEventBanner] = useState<EventBanner | null>(null);

  // Bottom sheet state
  const [sheetClosing, setSheetClosing] = useState<boolean>(false);
  const [dragY, setDragY] = useState<number>(0);
  const dragStartRef = useRef<number | null>(null);
  const [portalReady, setPortalReady] = useState<boolean>(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  // Refs for async safety and cleanup
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lockRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  // Stop camera controls safely
  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize Scanner - High-speed hardware-accelerated detection with optimized ZXing fallback
  useEffect(() => {
    mountedRef.current = true;

    async function initCamera() {
      if (!videoRef.current) return;
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setScanStatus('ERROR');
        setErrorMessage(
          'Kamera membutuhkan HTTPS atau localhost dan browser yang mendukung kamera. Gunakan alamat HTTPS, atau masukkan kode undangan secara manual.'
        );
        return;
      }

      const handleCameraError = (err: unknown) => {
        if (!mountedRef.current) return;
        const error = err as Error;
        if (error.name === 'NotAllowedError') {
          setScanStatus('DENIED');
          setErrorMessage('Izin kamera ditolak. Silakan masukkan kode secara manual.');
        } else if (error.name === 'NotFoundError') {
          setScanStatus('NOT_FOUND');
          setErrorMessage('Kamera tidak ditemukan pada perangkat ini. Silakan gunakan input manual.');
        } else {
          setScanStatus('ERROR');
          setErrorMessage('Gagal mengakses kamera. Silakan gunakan input manual.');
        }
      };

      // 1. Check for hardware-accelerated native BarcodeDetector API (fastest, near-zero latency in Chrome/Edge/Android)
      type BarcodeDetectorType = new (opts?: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
      };
      const BarcodeDetectorCtor =
        typeof window !== 'undefined'
          ? (window as unknown as {
              BarcodeDetector?: BarcodeDetectorType & {
                getSupportedFormats?: () => Promise<string[]>;
              };
            }).BarcodeDetector
          : undefined;

      let useNativeDetector = false;
      if (BarcodeDetectorCtor) {
        try {
          if (typeof BarcodeDetectorCtor.getSupportedFormats === 'function') {
            const formats = await BarcodeDetectorCtor.getSupportedFormats();
            useNativeDetector = Array.isArray(formats) && formats.includes('qr_code');
          } else {
            useNativeDetector = true;
          }
        } catch {
          useNativeDetector = false;
        }
      }

      if (useNativeDetector && BarcodeDetectorCtor) {
        try {
          const constraints: MediaStreamConstraints = {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
            },
          };

          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { facingMode: { ideal: 'environment' } },
            });
          }

          if (!mountedRef.current || !videoRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});

          const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
          let scanningActive = true;

          const detectFrame = async () => {
            if (!scanningActive || !mountedRef.current) return;
            const videoEl = videoRef.current;
            if (videoEl && videoEl.readyState >= 2 && !lockRef.current) {
              try {
                const detected = await detector.detect(videoEl);
                if (detected && detected.length > 0 && !lockRef.current && mountedRef.current) {
                  const codeText = detected[0].rawValue;
                  if (codeText) {
                    handleRawInput(codeText);
                  }
                }
              } catch {
                // Ignore transient frame detection error
              }
            }
            if (scanningActive && mountedRef.current) {
              // High-speed 30ms (~33 FPS) polling interval
              setTimeout(detectFrame, 30);
            }
          };

          setTimeout(detectFrame, 50);

          const nativeControls: IScannerControls = {
            stop: () => {
              scanningActive = false;
              stream.getTracks().forEach((t) => t.stop());
              if (videoRef.current) {
                videoRef.current.srcObject = null;
              }
            },
          };

          controlsRef.current = nativeControls;
          setScanStatus('READY');
          return;
        } catch (err: unknown) {
          // If native stream setup failed, fall through to ZXing fallback
          console.warn('Native BarcodeDetector init failed, falling back to ZXing:', err);
        }
      }

      // 2. High-performance fallback via optimized @zxing/browser
      try {
        const hints = new Map<number, unknown>();
        hints.set(3, true); // DecodeHintType.TRY_HARDER
        const codeReader = new BrowserQRCodeReader(hints, {
          delayBetweenScanAttempts: 60, // 60ms between attempts (~16.6 FPS) instead of default 500ms
          delayBetweenScanSuccess: 300,
        });

        const scanCallback = (
          result: { getText: () => string } | undefined,
          _error: unknown,
          controlsInstance: IScannerControls
        ) => {
          if (mountedRef.current && !controlsRef.current) {
            controlsRef.current = controlsInstance;
            setScanStatus('READY');
          }
          if (result && !lockRef.current && mountedRef.current) {
            handleRawInput(result.getText());
          }
        };

        let controls: IScannerControls;
        try {
          controls = await codeReader.decodeFromConstraints(
            {
              audio: false,
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
              },
            },
            videoRef.current,
            scanCallback
          );
        } catch (constraintErr: unknown) {
          const cErr = constraintErr as Error;
          if (cErr.name === 'OverconstrainedError' || cErr.name === 'ConstraintNotSatisfiedError') {
            controls = await codeReader.decodeFromConstraints(
              {
                audio: false,
                video: {
                  facingMode: { ideal: 'environment' },
                },
              },
              videoRef.current,
              scanCallback
            );
          } else {
            throw constraintErr;
          }
        }

        if (mountedRef.current) {
          controlsRef.current = controls;
          setScanStatus('READY');
        } else {
          controls.stop();
        }
      } catch (err: unknown) {
        handleCameraError(err);
      }
    }

    initCamera();

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopScanner]);

  // Handle Input (Camera or Manual)
  async function handleRawInput(input: string) {
    if (lockRef.current || !mountedRef.current) return;

    const parsedCode = parseQRData(input, trustedOrigin);
    if (!parsedCode) {
      setErrorMessage('Format QR code tidak valid atau bukan berasal dari domain acara ini.');
      return;
    }

    triggerScanFeedback();
    lockRef.current = true;
    setErrorMessage('');
    setRawCode(parsedCode);
    setScanState('RESOLVING');

    try {
      const res = await fetch(`/api/events/${eventId}/attendance/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: parsedCode }),
      });

      if (!mountedRef.current) return;

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setErrorMessage(errorData.message || 'Validasi kode presensi gagal.');
        setScanState('IDLE');
        lockRef.current = false;
        return;
      }

      const data: ResolveData = await res.json();
      setResolveData(data);
      if (data.event) {
        setEventBanner(data.event);
      }

      const maxPax = data.guest.maxPax;
      const alreadyScanned = typeof data.scannedPax === 'number' ? data.scannedPax : (data.attendance?.scannedPax ?? 0);
      const remainingPax = typeof data.remainingPax === 'number' ? data.remainingPax : Math.max(0, maxPax - alreadyScanned);
      const status = data.status || (alreadyScanned === 0 ? 'NOT_CHECKED_IN' : remainingPax === 0 ? 'COMPLETE' : 'PARTIAL');

      if (status === 'COMPLETE' || remainingPax === 0) {
        setScanState('ALREADY_CHECKED_IN');
      } else {
        let defaultPax = 1;
        if (status === 'NOT_CHECKED_IN' && data.rsvp?.response === 'YES' && typeof data.rsvp.pax === 'number') {
          defaultPax = Math.min(Math.max(1, data.rsvp.pax), remainingPax);
        } else {
          defaultPax = Math.min(1, remainingPax);
        }
        setSelectedPax(defaultPax);
        setScanState('PREVIEW');
      }
    } catch {
      if (!mountedRef.current) return;
      setErrorMessage('Terjadi gangguan jaringan saat memverifikasi kode.');
      setScanState('IDLE');
      lockRef.current = false;
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRawInput(manualInput);
  };

  const handleCheckIn = async () => {
    if (!mountedRef.current) return;
    setScanState('CHECKING_IN');

    try {
      const res = await fetch(`/api/events/${eventId}/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: rawCode, pax: selectedPax }),
      });

      if (!mountedRef.current) return;

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setErrorMessage(errorData.message || 'Proses check-in gagal.');
        // Stay in PREVIEW state so the operator can retry
        setScanState('PREVIEW');
        return;
      }

      const data: CheckInResponse = await res.json();

      if (data.result === 'ALREADY_CHECKED_IN') {
        setResolveData((prev) =>
          prev
            ? {
                ...prev,
                status: 'COMPLETE',
                scannedPax: data.scannedPax ?? prev.guest.maxPax,
                remainingPax: 0,
                attendance: data.attendance ?? prev.attendance,
              }
            : null,
        );
        setScanState('ALREADY_CHECKED_IN');
        return;
      }

      const maxPax = resolveData?.guest.maxPax ?? data.scannedPax ?? selectedPax;
      const currentTotal = data.scannedPax ?? ((resolveData?.scannedPax ?? 0) + selectedPax);
      const remaining = typeof data.remainingPax === 'number' ? data.remainingPax : Math.max(0, maxPax - currentTotal);
      const status: 'PARTIAL' | 'COMPLETE' = data.status || (remaining === 0 ? 'COMPLETE' : 'PARTIAL');
      const delta = data.deltaPax ?? selectedPax;

      const checkInTime = data.attendance?.scannedAt || new Date().toISOString();
      setLastCheckInResult({
        deltaPax: delta,
        scannedPax: currentTotal,
        remainingPax: remaining,
        maxPax,
        status,
        scannedAt: checkInTime,
      });

      setResolveData((prev) =>
        prev
          ? {
              ...prev,
              status,
              scannedPax: currentTotal,
              remainingPax: remaining,
              attendance: data.attendance ?? {
                scannedPax: currentTotal,
                scannedAt: checkInTime,
              },
            }
          : null,
      );
      setScanState('CHECKED_IN');
    } catch {
      if (!mountedRef.current) return;
      setErrorMessage('Terjadi gangguan jaringan saat mengirim data check-in.');
      setScanState('PREVIEW');
    }
  };

  const handleReset = () => {
    setScanState('IDLE');
    setRawCode('');
    setResolveData(null);
    setSelectedPax(1);
    setManualInput('');
    setErrorMessage('');
    setLastCheckInResult(null);
    setSheetClosing(false);
    setDragY(0);
    dragStartRef.current = null;
    lockRef.current = false;
  };

  // ---- Bottom sheet behaviour ----
  const sheetOpen = scanState !== 'IDLE' && !sheetClosing;
  const canDismiss = scanState !== 'RESOLVING' && scanState !== 'CHECKING_IN';

  const closeSheet = () => {
    if (!canDismiss || sheetClosing || scanState === 'IDLE') return;
    setSheetClosing(true);
    setDragY(0);
    window.setTimeout(() => {
      if (mountedRef.current) handleReset();
    }, 300);
  };

  // Keep a ref to the latest close handler for effects / timers
  const closeSheetRef = useRef(closeSheet);
  closeSheetRef.current = closeSheet;

  // Close with Escape key
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheetRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  // Lock page scroll while the sheet is open
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  // Auto-return to camera a few seconds after a successful check-in
  useEffect(() => {
    if (scanState !== 'CHECKED_IN') return;
    const t = window.setTimeout(() => closeSheetRef.current(), 4000);
    return () => window.clearTimeout(t);
  }, [scanState]);

  // Swipe-down to dismiss (touch + mouse via pointer events)
  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canDismiss) return;
    dragStartRef.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartRef.current));
  };
  const onDragEnd = () => {
    if (dragStartRef.current === null) return;
    dragStartRef.current = null;
    if (dragY > 100) {
      closeSheet();
    } else {
      setDragY(0);
    }
  };

  const renderSheetContent = () => {
    if (scanState === 'RESOLVING') {
      return (
        <div className="scan-state scan-state--loading" role="status">
          <span className="scan-spinner" aria-hidden="true" />
          <p>Memverifikasi kode undangan...</p>
        </div>
      );
    }

    if (!resolveData) return null;

    const guest = resolveData.guest;
    const maxPax = guest.maxPax;
    const alreadyScanned =
      typeof resolveData.scannedPax === 'number'
        ? resolveData.scannedPax
        : resolveData.attendance?.scannedPax ?? 0;
    const remainingPax =
      typeof resolveData.remainingPax === 'number'
        ? resolveData.remainingPax
        : Math.max(0, maxPax - alreadyScanned);
    const categoryLabel = formatCategory(guest.category);
    const rsvpResponse = resolveData.rsvp?.response;
    const rsvpLabel =
      rsvpResponse === 'YES'
        ? `Hadir (${resolveData.rsvp?.pax || 1} Pax)`
        : rsvpResponse === 'NO'
        ? 'Tidak Hadir'
        : 'Belum Konfirmasi';
    const rsvpTone = rsvpResponse === 'YES' ? 'yes' : rsvpResponse === 'NO' ? 'no' : 'pending';

    const guestHeader = (
      <div className="scan-guest">
        <div className="scan-guest__avatar" aria-hidden="true">
          {guest.name.trim().charAt(0).toUpperCase() || '?'}
        </div>
        <div className="scan-guest__info">
          <p className="scan-guest__label">
            {guest.customGreeting ? guest.customGreeting : 'Tamu Undangan'}
          </p>
          <h2 className="scan-guest__name">{guest.name}</h2>
          <div className="scan-guest__tags">
            {categoryLabel && <span className="scan-tag scan-tag--category">{categoryLabel}</span>}
            <span className={`scan-tag scan-tag--rsvp-${rsvpTone}`}>RSVP: {rsvpLabel}</span>
          </div>
        </div>
      </div>
    );

    if (scanState === 'PREVIEW' || scanState === 'CHECKING_IN') {
      const busy = scanState === 'CHECKING_IN';
      return (
        <>
          {guestHeader}

          <div className="scan-stats">
            <div className="scan-stat">
              <span className="scan-stat__value">{maxPax}</span>
              <span className="scan-stat__label">Maks. Pax</span>
            </div>
            <div className="scan-stat">
              <span className="scan-stat__value">{alreadyScanned}</span>
              <span className="scan-stat__label">Sudah Masuk</span>
            </div>
            <div className="scan-stat scan-stat--accent">
              <span className="scan-stat__value">{remainingPax}</span>
              <span className="scan-stat__label">Sisa Kuota</span>
            </div>
          </div>

          <div className="scan-pax">
            <p className="scan-pax__label">Jumlah tamu yang datang sekarang</p>
            <div className="pax-controls">
              <button
                type="button"
                onClick={() => setSelectedPax((p) => Math.max(1, p - 1))}
                disabled={busy || selectedPax <= 1}
                aria-label="Kurangi jumlah pax"
              >
                -
              </button>
              <span className="pax-value">{selectedPax}</span>
              <button
                type="button"
                onClick={() => setSelectedPax((p) => Math.min(remainingPax, p + 1))}
                disabled={busy || selectedPax >= remainingPax}
                aria-label="Tambah jumlah pax"
              >
                +
              </button>
            </div>
          </div>

          <CheckInHistory items={resolveData.checkIns} title="Riwayat Scan Sebelumnya" />

          {errorMessage && (
            <div className="scanner-error-message scan-sheet__error" aria-live="assertive">
              {errorMessage}
            </div>
          )}

          <div className="scan-actions">
            <button className="checkin-btn" onClick={handleCheckIn} disabled={busy}>
              {busy ? 'Memproses Check-in...' : `Check In ${selectedPax} Tamu`}
            </button>
            <button className="cancel-btn" onClick={closeSheet} disabled={busy}>
              Batal
            </button>
          </div>
        </>
      );
    }

    if (scanState === 'CHECKED_IN' && resolveData.attendance) {
      const result = lastCheckInResult;
      const isComplete = result?.status === 'COMPLETE' || result?.remainingPax === 0;
      return (
        <div className="scan-result scan-result--success" id="scanner-success-card">
          <div className="scan-result__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2>{isComplete ? 'Check-In Selesai!' : 'Check-In Berhasil!'}</h2>
          <p className="scan-result__name">{guest.name}</p>
          {categoryLabel && <span className="scan-tag scan-tag--category">{categoryLabel}</span>}
          {result ? (
            <div className="scan-result__details">
              <p className="scan-result__delta">{result.deltaPax} tamu berhasil check-in</p>
              <p>
                Total hadir: <strong>{result.scannedPax} / {result.maxPax}</strong>
              </p>
              {!isComplete ? (
                <p className="scan-result__remaining">
                  Sisa kuota: <strong>{result.remainingPax}</strong>
                </p>
              ) : (
                <p className="scan-result__complete">Seluruh kuota tamu sudah masuk</p>
              )}
            </div>
          ) : (
            <p>{resolveData.attendance.scannedPax} Pax</p>
          )}
          <p className="scan-result__time">
            Waktu:{' '}
            {new Date(resolveData.attendance.scannedAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
          <div className="scan-autoclose" aria-hidden="true">
            <span className="scan-autoclose__bar" />
          </div>
          <button className="reset-btn" onClick={closeSheet}>
            Scan Tamu Berikutnya
          </button>
        </div>
      );
    }

    if (scanState === 'ALREADY_CHECKED_IN' && resolveData.attendance) {
      return (
        <div className="scan-result scan-result--warning" id="scanner-warning-card">
          <div className="scan-result__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="7" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2>Sudah Check-In Lengkap</h2>
          <p className="scan-result__name">{guest.name}</p>
          {categoryLabel && <span className="scan-tag scan-tag--category">{categoryLabel}</span>}
          <div className="scan-result__details">
            <p>
              Total hadir:{' '}
              <strong>
                {resolveData.scannedPax ?? resolveData.attendance.scannedPax} / {maxPax} Pax
              </strong>
            </p>
            <p>Semua kuota tamu sudah masuk.</p>
          </div>
          <p className="scan-result__time">
            Waktu terakhir:{' '}
            {new Date(resolveData.attendance.scannedAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
          <CheckInHistory items={resolveData.checkIns} title="Riwayat Scan" />
          <button className="reset-btn" onClick={closeSheet}>
            Scan Tamu Berikutnya
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="scanner-layout">
      {/* Viewport Area */}
      <div
        className={`scanner-viewport-container${
          scanState !== 'IDLE' ? ' scanner-viewport-container--success' : ''
        }`}
      >
        <video
          ref={videoRef}
          className="scanner-video"
          playsInline
          muted
        />

        {/* Active high-speed scanning laser indicator */}
        {scanStatus === 'READY' && scanState === 'IDLE' && (
          <div className="scanner-laser" aria-hidden="true" />
        )}

        {/* Overlay statuses */}
        <div className="scanner-overlay" aria-live="polite">
          {scanStatus === 'INITIALIZING' && <p>Menginisialisasi Kamera...</p>}
          {['ERROR', 'DENIED', 'NOT_FOUND'].includes(scanStatus) && (
            <p className="scanner-error">{errorMessage}</p>
          )}
        </div>
      </div>

      {/* Manual Input Fallback */}
      <div className="scanner-manual-input">
        <form onSubmit={handleManualSubmit}>
          <input
            type="text"
            placeholder="Masukkan kode 22-karakter atau tautan undangan"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            disabled={scanState !== 'IDLE'}
            aria-label="Input kode presensi manual"
          />
          <button type="submit" disabled={scanState !== 'IDLE' || !manualInput.trim()}>
            Kirim Kode
          </button>
        </form>
      </div>

      {/* Error Message for Logic (shown below camera when the sheet is closed) */}
      {errorMessage && scanStatus === 'READY' && scanState === 'IDLE' && (
        <div className="scanner-error-message" aria-live="assertive">
          {errorMessage}
        </div>
      )}

      {/* Bottom Sheet: guest data + event banner (slides up after a scan) */}
      {portalReady && createPortal(
      <>
      <div
        className={`scan-sheet-backdrop${sheetOpen ? ' is-open' : ''}`}
        onClick={closeSheet}
        aria-hidden="true"
      />
      <section
        className={`scan-sheet${sheetOpen ? ' is-open' : ''}${dragY > 0 ? ' is-dragging' : ''}`}
        style={dragY > 0 ? ({ '--drag-y': `${dragY}px` } as React.CSSProperties) : undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Detail tamu hasil scan"
        aria-hidden={!sheetOpen}
      >
        <div
          className="scan-sheet__grab"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <span className="scan-sheet__handle" aria-hidden="true" />
          <EventBannerView banner={resolveData?.event ?? eventBanner} />
        </div>
        <div className="scan-sheet__body" aria-live="polite">
          {renderSheetContent()}
        </div>
      </section>
      </>,
      document.body
      )}
    </div>
  );
}
