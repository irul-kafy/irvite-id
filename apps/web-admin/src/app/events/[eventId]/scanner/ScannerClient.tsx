'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { parseQRData } from '../../../../utils/qr-parser';
import './scanner.css';

interface ScannerClientProps {
  eventId: string;
  trustedOrigin: string;
}

type ScanStatus = 'INITIALIZING' | 'READY' | 'ERROR' | 'DENIED' | 'NOT_FOUND';
type ScanState = 'IDLE' | 'RESOLVING' | 'PREVIEW' | 'CHECKING_IN' | 'CHECKED_IN' | 'ALREADY_CHECKED_IN';

interface ResolveData {
  guest: { name: string; maxPax: number };
  rsvp?: { response: string; pax?: number };
  attendance?: { scannedPax: number; scannedAt: string };
}

interface CheckInResponse {
  result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN';
  attendance: {
    scannedPax: number;
    scannedAt: string;
  };
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

  // Initialize Scanner - Single camera acquisition via ZXing preferring environment camera
  useEffect(() => {
    mountedRef.current = true;
    const codeReader = new BrowserQRCodeReader();

    async function initCamera() {
      if (!videoRef.current) return;

      try {
        // Single camera acquisition flow preferring rear/environment camera on mobile
        // Uses ideal constraint so devices without an environment camera gracefully fall back to default/front camera
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
              },
            },
            videoRef.current,
            scanCallback
          );
        } catch (constraintErr: unknown) {
          const cErr = constraintErr as Error;
          if (cErr.name === 'OverconstrainedError' || cErr.name === 'ConstraintNotSatisfiedError') {
            // Fallback when environment camera constraint cannot be satisfied on device
            controls = await codeReader.decodeFromConstraints(
              {
                audio: false,
                video: true,
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

      const data = await res.json();

      if (data.attendance) {
        setResolveData(data);
        setScanState('ALREADY_CHECKED_IN');
      } else {
        setResolveData(data);

        // Determine default pax: if RSVP is YES and pax is valid number, use min(rsvp.pax, maxPax)
        let defaultPax = 1;
        if (data.rsvp?.response === 'YES' && typeof data.rsvp.pax === 'number') {
          defaultPax = Math.min(Math.max(1, data.rsvp.pax), data.guest.maxPax);
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
      // Correct assignment: store data.attendance (not full data object) to prevent double nesting
      setResolveData((prev) => (prev ? { ...prev, attendance: data.attendance } : null));

      if (data.result === 'ALREADY_CHECKED_IN') {
        setScanState('ALREADY_CHECKED_IN');
      } else {
        setScanState('CHECKED_IN');
      }
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
    lockRef.current = false;
  };

  return (
    <div className="scanner-layout">
      {/* Viewport Area */}
      <div className="scanner-viewport-container">
        <video
          ref={videoRef}
          className="scanner-video"
          playsInline
          muted
        />

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

      {/* Error Message for Logic */}
      {errorMessage && scanStatus === 'READY' && (
        <div className="scanner-error-message" aria-live="assertive">
          {errorMessage}
        </div>
      )}

      {/* UI States */}
      <div className="scanner-ui-states" aria-live="polite">
        {scanState === 'RESOLVING' && (
          <div className="scanner-card loading-card">
            <h2>Memverifikasi Kode...</h2>
          </div>
        )}

        {scanState === 'PREVIEW' && resolveData && (
          <div className="scanner-card preview-card">
            <h2>{resolveData.guest.name}</h2>
            <p className="rsvp-status">
              RSVP:{' '}
              <strong>
                {resolveData.rsvp?.response === 'YES'
                  ? `Hadir (${resolveData.rsvp.pax || 1} Pax)`
                  : resolveData.rsvp?.response === 'NO'
                  ? 'Tidak Hadir'
                  : 'Belum Konfirmasi'}
              </strong>
            </p>

            <div className="pax-controls">
              <button
                type="button"
                onClick={() => setSelectedPax((p) => Math.max(1, p - 1))}
                disabled={selectedPax <= 1}
                aria-label="Kurangi jumlah pax"
              >
                -
              </button>
              <span className="pax-value">{selectedPax}</span>
              <button
                type="button"
                onClick={() => setSelectedPax((p) => Math.min(resolveData.guest.maxPax, p + 1))}
                disabled={selectedPax >= resolveData.guest.maxPax}
                aria-label="Tambah jumlah pax"
              >
                +
              </button>
            </div>
            <p className="max-pax-hint">Maksimal diizinkan: {resolveData.guest.maxPax} Pax</p>

            <button className="checkin-btn" onClick={handleCheckIn}>
              Check-in {selectedPax} Pax
            </button>
            <button className="cancel-btn" onClick={handleReset}>
              Batal
            </button>
          </div>
        )}

        {scanState === 'CHECKING_IN' && (
          <div className="scanner-card loading-card">
            <h2>Memproses Check-in...</h2>
          </div>
        )}

        {scanState === 'CHECKED_IN' && resolveData?.attendance && (
          <div className="scanner-card success-card" id="scanner-success-card">
            <h2>Check-In Berhasil!</h2>
            <p className="scanned-info">
              <strong>{resolveData.guest.name}</strong> • {resolveData.attendance.scannedPax} Pax
            </p>
            <p className="scanned-time" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Waktu:{' '}
              {new Date(resolveData.attendance.scannedAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <button className="reset-btn" onClick={handleReset}>
              Scan Tamu Berikutnya
            </button>
          </div>
        )}

        {scanState === 'ALREADY_CHECKED_IN' && resolveData?.attendance && (
          <div className="scanner-card warning-card" id="scanner-warning-card">
            <h2>Sudah Check-In Sebelumnya</h2>
            <p className="scanned-info">
              <strong>{resolveData.guest.name}</strong> • {resolveData.attendance.scannedPax} Pax
            </p>
            <p className="scanned-time" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Waktu:{' '}
              {new Date(resolveData.attendance.scannedAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <button className="reset-btn" onClick={handleReset}>
              Scan Tamu Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
