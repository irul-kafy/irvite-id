import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IRVITE | Premium Digital Invitation',
  description: 'Layanan undangan digital premium & eksklusif. Terima Beres.',
  keywords: ['undangan digital', 'undangan pernikahan', 'QR code', 'digital invitation', 'IRVITE'],
  openGraph: {
    title: 'IRVITE — Undangan Digital Premium',
    description: 'Layanan undangan digital terima beres untuk pernikahan eksklusif Anda.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
