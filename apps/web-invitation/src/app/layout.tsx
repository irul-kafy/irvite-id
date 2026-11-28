import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://irvite.id'),
  title: 'IRVITE | Premium Digital Invitation',
  description: 'Layanan undangan digital premium & eksklusif. Terima Beres.',
  keywords: ['undangan digital', 'undangan pernikahan', 'QR code', 'digital invitation', 'IRVITE'],
  openGraph: {
    title: 'IRVITE | Premium Digital Invitation',
    description: 'Layanan undangan digital terima beres untuk pernikahan eksklusif Anda.',
    type: 'website',
    images: [
      {
        url: '/images/gateway-undangan.jpg',
        width: 1200,
        height: 630,
        alt: 'IRVITE Digital Invitation',
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
