/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.dataset.theme === 'dark';
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const isCurrentlyDark =
      root.classList.contains('dark') || root.dataset.theme === 'dark';
    const newTheme = isCurrentlyDark ? 'light' : 'dark';

    // Temporarily kill transitions for an instant switch
    const noTransition = document.createElement('style');
    noTransition.appendChild(
      document.createTextNode('*,*::before,*::after{transition:none!important}')
    );
    document.head.appendChild(noTransition);

    root.classList.toggle('dark', newTheme === 'dark');
    root.dataset.theme = newTheme;
    root.style.colorScheme = newTheme;

    void window.getComputedStyle(root).backgroundColor;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => noTransition.remove());
    });

    setTheme(newTheme);

    try {
      localStorage.setItem('irvite-theme', newTheme);
    } catch {
      // ignore storage error
    }
  };

  if (!theme) {
    return (
      <div
        className="theme-toggle lp-nav__theme-toggle"
        style={{ visibility: 'hidden' }}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      className="theme-toggle lp-nav__theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Aktifkan mode ${theme === 'light' ? 'malam' : 'terang'}`}
      title={`Mode ${theme === 'light' ? 'malam' : 'terang'}`}
    >
      <span className="sun" aria-hidden="true">☼</span>
      <span className="moon" aria-hidden="true">☾</span>
    </button>
  );
}
