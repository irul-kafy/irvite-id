import { redirect } from 'next/navigation';
import ScannerClient from './ScannerClient';
import { cookies } from 'next/headers';
import { getTrustedInvitationOrigin } from '@/utils/url';

export default async function ScannerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect('/login');
  }

  // Obtain trusted configuration server-side using validated canonical helper
  const trustedOrigin = getTrustedInvitationOrigin();

  if (!trustedOrigin) {
    return (
      <div className="scanner-page-container">
        <header className="scanner-header">
          <h1>Event Scanner</h1>
        </header>
        <main className="scanner-main">
          <div
            className="scanner-card warning-card"
            style={{ padding: '2rem 1.5rem', textAlign: 'center' }}
            role="alert"
            id="scanner-config-missing-alert"
          >
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>
              Konfigurasi Scanner Belum Tersedia
            </h2>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
              Origin undangan publik belum dikonfigurasi. Scanner QR belum dapat digunakan.
            </p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
              Silakan hubungi administrator sistem untuk melengkapi konfigurasi origin undangan.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="scanner-page-container">
      <header className="scanner-header">
        <h1>Event Scanner</h1>
      </header>
      <main className="scanner-main">
        <ScannerClient 
          eventId={eventId} 
          trustedOrigin={trustedOrigin} 
        />
      </main>
    </div>
  );
}
