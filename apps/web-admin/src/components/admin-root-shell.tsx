'use client';

import { useLayoutEffect, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AdminShell from './admin-shell';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function AdminRootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize theme synchronously before browser paint, without script tag in JSX
  useIsomorphicLayoutEffect(() => {
    try {
      const stored = localStorage.getItem('irvite-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // ignore
    }
  }, []);

  // /login route renders independently without the admin shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
