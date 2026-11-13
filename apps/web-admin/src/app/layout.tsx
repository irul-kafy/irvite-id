import type { Metadata } from 'next';
import AdminRootShell from '../components/admin-root-shell';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'IRVITE Admin',
    template: '%s | IRVITE Admin',
  },
  description: 'Internal operational hub for IRVITE Digital Invitation Platform',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <AdminRootShell>
          {children}
        </AdminRootShell>
      </body>
    </html>
  );
}
