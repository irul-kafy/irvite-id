import Link from 'next/link';
import { getCatalogTemplates, filterAvailableTemplates } from '../catalog';
import { fetchPublicTemplateAvailability } from '../api/client';
import { HomeGatewayClient } from '../components/home-gateway-client';
import UndanganLandingPage from './undangan/page';
import { isTicketingEnabled } from '../config/features';

export const dynamic = 'force-dynamic';

/**
 * Beranda Utama Client IRVITE.
 *
 * 1. Mode Hosting / Produksi (Default di Vercel):
 *    Menampilkan 100% murni Landing Page Undangan Digital Pernikahan:
 *    - Alur Pemesanan (eyebrow)
 *    - Alur praktis dari draf hingga undangan siap disebar. (heading)
 *    - Katalog Template Undangan (koleksi desain eksklusif)
 *    - Paket Layanan & Konsultasi WhatsApp
 *
 * 2. Mode Pengembangan / Localhost:
 *    Menampilkan Home Gateway 2x2 (Beli Tiket, Undangan Pernikahan, Partnership, Customer Services)
 *    sehingga pengembang dapat menguji fitur e-tiket dan pendaftaran event tanpa memengaruhi publik.
 */
export default async function LandingPage() {
  if (!isTicketingEnabled()) {
    return <UndanganLandingPage />;
  }

  const availability = await fetchPublicTemplateAvailability();
  const allTemplates = getCatalogTemplates();
  const templates =
    availability && availability.length > 0
      ? filterAvailableTemplates(allTemplates, availability)
      : [];

  return (
    <>
      <HomeGatewayClient />
      <div style={{ display: 'none' }} aria-hidden="true" data-template-count={templates.length}>
        <Link href="/templates">Katalog Template Undangan</Link>
      </div>
    </>
  );
}
