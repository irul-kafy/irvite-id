import Link from 'next/link';
import { getCatalogTemplates, filterAvailableTemplates } from '../catalog';
import { fetchPublicTemplateAvailability } from '../api/client';
import { HomeGatewayClient } from '../components/home-gateway-client';

export const dynamic = 'force-dynamic';

/**
 * Beranda Utama Client IRVITE (Home Gateway 2x2).
 * Menu Undangan Pernikahan menghubungkan ke /undangan (Alur Pemesanan — Alur praktis dari draf hingga undangan siap disebar.)
 * dan katalog publik href="/templates".
 */
export default async function LandingPage() {
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
