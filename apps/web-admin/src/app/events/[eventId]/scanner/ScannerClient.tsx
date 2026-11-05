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
type ScanState = 'IDLE' | 'RESOLVING' | 'PREVIEW' | 'CHECKING_IN' | 'CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'ERROR';

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
  guest: { name: string; maxPax: number; category?: string | null; customGreeting?: string | null; tableNumber?: string | null };
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
  const [undoing, setUndoing] = useState<boolean>(false);
  const [undoSuccessToast, setUndoSuccessToast] = useState<string>('');
  const [eventBanner, setEventBanner] = useState<EventBanner | null>(null);
  const [showStaffGuideModal, setShowStaffGuideModal] = useState<boolean>(false);

  // Bottom sheet state
  const [sheetClosing, setSheetClosing] = useState<boolean>(false);
  const [dragY, setDragY] = useState<number>(0);
  const dragStartRef = useRef<number | null>(null);
  const [portalReady, setPortalReady] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setPortalReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Refs for async safety and cleanup
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lockRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const handleRawInputRef = useRef<(input: string) => Promise<void>>(async () => {});

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

  // Camera Facing State: 'environment' (rear/back) or 'user' (front/selfie)
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('irvite_scanner_camera_facing');
        if (saved === 'user' || saved === 'environment') return saved;
      } catch {
        // ignore
      }
    }
    return 'environment';
  });

  const toggleCameraFacing = useCallback(() => {
    stopScanner();
    setScanStatus('INITIALIZING');
    setCameraFacing((prev) => {
      const next = prev === 'environment' ? 'user' : 'environment';
      try {
        localStorage.setItem('irvite_scanner_camera_facing', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, [stopScanner]);

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
              facingMode: { ideal: cameraFacing },
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
              video: { facingMode: { ideal: cameraFacing } },
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
                    void handleRawInputRef.current(codeText);
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
            void handleRawInputRef.current(result.getText());
          }
        };

        let controls: IScannerControls;
        try {
          controls = await codeReader.decodeFromConstraints(
            {
              audio: false,
              video: {
                facingMode: { ideal: cameraFacing },
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
                  facingMode: { ideal: cameraFacing },
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
  }, [cameraFacing, stopScanner]);

  useEffect(() => {
    handleRawInputRef.current = handleRawInput;
  });

  // Handle Input (Camera or Manual)
  async function handleRawInput(input: string) {
    if (lockRef.current || !mountedRef.current) return;

    const parsedCode = parseQRData(input, trustedOrigin);
    if (!parsedCode) {
      triggerScanFeedback();
      lockRef.current = true;
      setErrorMessage('Format QR code tidak valid atau bukan berasal dari domain acara ini.');
      setScanState('ERROR');
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
        let msg = errorData.message || 'Validasi kode presensi gagal.';
        if (msg === 'Event is not PUBLISHED' || /not published/i.test(msg)) {
          msg = 'Acara belum dipublikasikan (status masih DRAFT). Harap publikasikan acara terlebih dahulu di Dashboard agar petugas staff dapat memindai kehadiran tamu.';
        } else if (msg === 'Event has expired' || /expired/i.test(msg)) {
          msg = 'Acara telah kedaluwarsa atau melewati batas waktu aktif. Presensi kehadiran tidak dapat dilakukan lagi.';
        } else if (msg === 'Invitation not found for this event' || /invitation not found/i.test(msg)) {
          msg = 'Tamu / Kode QR ini tidak terdaftar pada acara ini. Pastikan tamu membuka tiket undangan dari acara yang benar.';
        } else if (res.status === 403 || /forbidden|tidak memiliki akses/i.test(msg)) {
          msg = 'Akses ditolak: Akun petugas Anda belum ditugaskan ke acara ini. Hubungi admin untuk memberikan penugasan staff scanner.';
        }
        setErrorMessage(msg);
        setScanState('ERROR');
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
      setErrorMessage('Terjadi gangguan jaringan saat memverifikasi kode. Periksa koneksi internet perangkat Anda.');
      setScanState('ERROR');
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

  const handleUndoCheckIn = async () => {
    if (!mountedRef.current || undoing) return;
    setUndoing(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/events/${eventId}/attendance/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: rawCode }),
      });

      if (!mountedRef.current) return;

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setErrorMessage(errorData.message || 'Gagal mengurungkan check-in.');
        setUndoing(false);
        return;
      }

      const undoData = await res.json();
      setUndoSuccessToast(undoData.message || 'Check-in berhasil diurungkan.');

      setScanState('IDLE');
      lockRef.current = false;
      setTimeout(() => {
        setUndoSuccessToast('');
      }, 4500);
    } catch {
      if (!mountedRef.current) return;
      setErrorMessage('Terjadi gangguan jaringan saat mengurungkan check-in.');
    } finally {
      setUndoing(false);
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
    window.setTimeout(() => {
      if (mountedRef.current) {
        lockRef.current = false;
      }
    }, 500);
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
            {guest.tableNumber && (
              <span className="scan-tag scan-tag--table" style={{ background: '#047857', color: '#ecfdf5', fontWeight: 700 }}>
                📍 Meja: {guest.tableNumber}
              </span>
            )}
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
          {guest.tableNumber && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                margin: '0.25rem auto 0.5rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                background: '#064e3b',
                color: '#6ee7b7',
                fontSize: '0.875rem',
                fontWeight: 700,
                border: '1px solid rgba(110, 231, 183, 0.4)',
              }}
            >
              <span>📍 Silakan Arahkan ke:</span>
              <strong style={{ color: '#ffffff' }}>Meja {guest.tableNumber}</strong>
            </div>
          )}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1rem', width: '100%' }}>
            <button className="reset-btn" onClick={closeSheet} style={{ width: '100%' }}>
              Scan Tamu Berikutnya
            </button>
            <button
              type="button"
              onClick={handleUndoCheckIn}
              disabled={undoing}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                color: '#dc2626',
                borderRadius: '8px',
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: undoing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {undoing ? 'Mengurungkan...' : '↩ Salah Input? Urungkan Check-in'}
            </button>
          </div>
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

    if (scanState === 'ERROR') {
      const isDraftError = errorMessage.includes('DRAFT') || errorMessage.includes('dipublikasikan');
      return (
        <div className="scan-result scan-result--error" id="scanner-error-card">
          <div className="scan-result__icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="30"
              height="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>{isDraftError ? 'Acara Belum Dipublikasikan' : 'Validasi QR Gagal'}</h2>
          <p
            style={{
              color: 'var(--text-secondary, #4b5563)',
              fontSize: '0.9375rem',
              lineHeight: 1.55,
              margin: '0.5rem auto 1.25rem',
              maxWidth: '380px',
              textAlign: 'center',
            }}
          >
            {errorMessage}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%', marginTop: '0.5rem' }}>
            <button className="reset-btn" onClick={closeSheet} style={{ width: '100%' }}>
              Scan Tamu Berikutnya
            </button>
            {isDraftError && (
              <button
                type="button"
                onClick={() => router.push(`/events/${eventId}`)}
                style={{
                  width: '100%',
                  background: 'var(--surface-secondary, #f3f4f6)',
                  border: '1px solid var(--border-color, #d1d5db)',
                  color: 'var(--text-primary, #1f2937)',
                  borderRadius: '8px',
                  padding: '0.625rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Buka Halaman Acara untuk Publish →
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="scanner-layout">
      {undoSuccessToast && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#059669',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            maxWidth: '90vw',
          }}
        >
          <span>✓</span>
          <span>{undoSuccessToast}</span>
        </div>
      )}
      {/* Viewport Area */}
      <div
        className={`scanner-viewport-container${
          scanState !== 'IDLE' ? ' scanner-viewport-container--success' : ''
        }`}
      >
        <video
          ref={videoRef}
          className={`scanner-video${cameraFacing === 'user' ? ' scanner-video--mirrored' : ''}`}
          playsInline
          muted
        />

        {/* Active high-speed scanning laser indicator */}
        {scanStatus === 'READY' && scanState === 'IDLE' && (
          <div className="scanner-laser" aria-hidden="true" />
        )}

        {/* Floating Flip Camera Toggle Button (Front/Back) */}
        <button
          type="button"
          id="btn-flip-camera"
          className="scanner-flip-camera-btn"
          onClick={toggleCameraFacing}
          title={cameraFacing === 'environment' ? 'Klik untuk ganti ke Kamera Depan' : 'Klik untuk ganti ke Kamera Belakang'}
          aria-label={`Ganti ke ${cameraFacing === 'environment' ? 'kamera depan' : 'kamera belakang'}`}
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 16v-4a4 4 0 0 0-4-4H4" />
            <polyline points="8 4 4 8 8 12" />
            <path d="M4 8v4a4 4 0 0 0 4 4h12" />
            <polyline points="16 20 20 16 16 12" />
          </svg>
          <span>{cameraFacing === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
        </button>

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

      {/* Staff SOP Quick Guide Trigger */}
      <div style={{ textAlign: 'center', margin: '0.25rem 0 0.75rem 0' }}>
        <button
          type="button"
          onClick={() => setShowStaffGuideModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary, #6b7280)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <span>📖</span> SOP Ringkas Petugas Scan
        </button>
      </div>

      {/* Staff SOP Guide Modal */}
      {showStaffGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="SOP Petugas Scan Kehadiran"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowStaffGuideModal(false)}
        >
          <div
            style={{
              background: 'var(--surface-primary, #ffffff)',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📋</span>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  SOP Petugas Scan Meja Registrasi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffGuideModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.25rem',
                }}
                aria-label="Tutup panduan"
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <strong style={{ fontSize: '0.875rem', color: '#166534' }}>1. Pindai QR Tamu Otomatis</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#14532d', lineHeight: 1.4 }}>
                  Dekatkan QR tiket/layar ponsel tamu ke kamera (15–25 cm). Kamera akan berbunyi beep/getar dan menampilkan data tamu seketika.
                </p>
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>2. Cek Kuota & Rombongan (Pax)</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#334155', lineHeight: 1.4 }}>
                  Lihat jumlah <em>Maks. Pax</em> pada kartu. Bila tamu datang sebagian (misal 1 dari 2), atur jumlah pax sebelum klik check-in.
                </p>
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>3. Input Manual Bila Layar Tamu Rusak</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#334155', lineHeight: 1.4 }}>
                  Jika kamera silau atau layar tamu gelap/retak, ketik 22-karakter unik undangan pada kolom input di bawah kamera lalu klik Kirim Kode.
                </p>
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                <strong style={{ fontSize: '0.875rem', color: '#991b1b' }}>4. Salah Input? Urungkan Seketika</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#7f1d1d', lineHeight: 1.4 }}>
                  Bila salah scan atau keliru hitung pax, segera tekan tombol merah <strong>&ldquo;↩ Salah Input? Urungkan Check-in&rdquo;</strong> di kartu scan. Data langsung dibatalkan di sistem &amp; spreadsheet.
                </p>
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <strong style={{ fontSize: '0.875rem', color: '#166534' }}>5. Pantau Live Monitor</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#14532d', lineHeight: 1.4 }}>
                  Gunakan tombol <em>⚡ Buka Live Monitor Kehadiran</em> di atas untuk memantau sisa kapasitas dan kehadiran tamu VIP.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowStaffGuideModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.25rem', padding: '0.625rem' }}
            >
              Saya Mengerti, Lanjutkan Scan
            </button>
          </div>
        </div>
      )}

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
