/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Inline SVG Icons ──────────────────────────────────────────────────────────

function IconEye({ hidden }: { hidden?: boolean }) {
  return hidden ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="admin-login__spinner"
    >
      <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      <path d="M9 2a7 7 0 0 1 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Theme Toggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('irvite-theme', next);
    } catch {
      // ignore
    }
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!theme) {
    return <div className="admin-login__theme-btn" style={{ visibility: 'hidden' }} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="admin-login__theme-btn"
      aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError('Email atau kata sandi tidak valid. Silakan coba lagi.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      {/* Theme toggle — top right */}
      <div className="admin-login__theme-area">
        <ThemeToggle />
      </div>

      {/* Left brand panel */}
      <div className="admin-login__panel" aria-hidden="true">
        <div className="admin-login__panel-inner">
          <div className="admin-login__panel-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="IRVITE.ID"
              className="admin-login__panel-logo"
            />
          </div>
          <p className="admin-login__panel-wordmark">irvite.id</p>
          <div className="admin-login__panel-ornament" />
          <p className="admin-login__panel-tagline">
            Digital Invitation<br />Management System
          </p>
          <p className="admin-login__panel-sub">
            Kelola undangan, tamu, dan acara dengan elegan.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="admin-login__form-area">
        <div className="admin-login__card">
          {/* Heading */}
          <h1 className="admin-login__title">Selamat Datang Kembali</h1>
          <p className="admin-login__subtitle">
            Masuk untuk mengelola undangan dan acara.
          </p>

          {/* Error */}
          {error && (
            <div
              id="login-error"
              className="admin-login__alert"
              role="alert"
              aria-live="polite"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form
            id="admin-login-form"
            className="admin-login__form"
            onSubmit={handleLogin}
            noValidate
          >
            {/* Email */}
            <div className="admin-login__field">
              <label className="admin-login__label" htmlFor="admin-login-email">
                Email
              </label>
              <input
                id="admin-login-email"
                type="email"
                className="admin-login__input"
                placeholder="admin@irvite.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            {/* Password */}
            <div className="admin-login__field">
              <label className="admin-login__label" htmlFor="admin-login-password">
                Kata Sandi
              </label>
              <div className="admin-login__pw-wrap">
                <input
                  id="admin-login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="admin-login__input admin-login__input--pw"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="admin-login__pw-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  <IconEye hidden={showPassword} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="admin-login-submit"
              type="submit"
              className="admin-login__submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <IconSpinner />
                  Memproses…
                </>
              ) : (
                'Masuk ke Dashboard'
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="admin-login__note">Khusus untuk pengguna internal</p>
        </div>
      </div>
    </div>
  );
}
