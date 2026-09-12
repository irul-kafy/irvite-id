 import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'IRVITE.ID | Premium Digital Invitation',
  description: 'Layanan undangan digital premium & eksklusif. Terima Beres.',
  keywords: ['undangan digital', 'undangan pernikahan', 'QR code', 'digital invitation', 'IRVITE.ID'],
  openGraph: {
    title: 'IRVITE.ID — Undangan Digital Premium',
    description: 'Layanan undangan digital terima beres untuk pernikahan eksklusif Anda.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              var theme = localStorage.getItem('irvite-theme');
              if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {}
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
