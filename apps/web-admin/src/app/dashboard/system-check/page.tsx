'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './system-check.css';

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

export default function SystemCheckPage() {
  const router = useRouter();
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);
  const [checkedAt, setCheckedAt] = useState('');
  const [error, setError] = useState('');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) { router.replace('/login'); return; }
        if (!response.ok) throw new Error('Sesi belum dapat diverifikasi. Periksa koneksi API lalu muat ulang.');
        const { user } = await response.json();
        if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role)) {
          router.replace('/dashboard');
          return;
        }
        setAuthorized(true);
      })
      .catch((e: Error) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [router]);

  async function runChecks() {
    setRunning(true);
    setError('');
    try {
      const response = await fetch('/api/system-check', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (response.status === 401) { router.replace('/login'); return; }
      if (response.status === 403) { router.replace('/dashboard'); return; }
      if (!response.ok) throw new Error('Pemeriksaan belum berhasil. Periksa koneksi server lalu coba lagi.');
      const result: { checks: Check[] } = await response.json();
      setChecks([...result.checks, {
        label: 'Browser scanner',
        ok: window.isSecureContext && !!navigator.mediaDevices?.getUserMedia,
        detail: window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
          ? 'API kamera tersedia. Izin dan kamera fisik diuji saat membuka scanner event.'
          : 'Gunakan HTTPS atau localhost. Input kode manual tetap tersedia.',
      }]);
      setCheckedAt(new Date().toLocaleString('id-ID'));
    } catch (e) {
      setChecks([]);
      setError(e instanceof Error ? e.message : 'Pemeriksaan gagal.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="system-check">
      <p className="system-check__eyebrow">IRVITE.ID / OPERASIONAL WEB</p>
      <h1>Pengecekan Sistem</h1>
      <p className="system-check__intro">Periksa koneksi layanan sebelum mengelola undangan atau menerima tamu. Pemeriksaan ini hanya membaca status.</p>
      <button className="system-check__button" disabled={!authorized || running} onClick={runChecks}>
        {running ? 'Memeriksa…' : 'Jalankan pengecekan'}
      </button>
      <div aria-live="polite" aria-busy={running}>
        {error && <p className="system-check__error" role="alert">{error}</p>}
        {checkedAt && !error && <p className="system-check__timestamp">Hasil pada {checkedAt}. Tekan kembali untuk memperbarui.</p>}
        <ul className="system-check__results">
          {checks.map((check) => <li key={check.label}>
            <div><h2>{check.label}</h2><p>{check.detail}</p></div>
            <span className={check.ok ? 'system-check__pass' : 'system-check__warn'}>{check.ok ? 'Lolos' : 'Perlu perhatian'}</span>
          </li>)}
        </ul>
      </div>
      <section className="system-check__next">
        <h2>Uji alur acara</h2>
        <p>Status layanan tidak menggantikan uji acara. Dari event uji, periksa impor tamu, undangan umum/personal, RSVP, scan QR bertahap, dan ekspor laporan. Scanner berjalan langsung di browser HP atau laptop.</p>
        <Link href="/events">Buka daftar event →</Link>
      </section>
    </main>
  );
}
