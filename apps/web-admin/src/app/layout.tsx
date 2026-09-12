import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'IRVITE.ID Admin',
    template: '%s | IRVITE.ID Admin',
  },
  description: 'Internal operational hub for IRVITE.ID Digital Invitation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <Script id="admin-theme-init" strategy="beforeInteractive">
          {`
            try {
              var t = localStorage.getItem('irvite-theme');
              if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {}
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
