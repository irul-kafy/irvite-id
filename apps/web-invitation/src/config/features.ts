/**
 * IRVITE Feature Flags Configuration
 *
 * Menentukan apakah modul E-Tiket, Beranda Gateway (E-Tiket + Undangan), & Partnership aktif.
 *
 * Aturan Kerja:
 * 1. Jika disetel secara eksplisit via `process.env.NEXT_PUBLIC_ENABLE_TICKETING`:
 *    - 'false', '0', atau 'no'  -> NON-AKTIF
 *    - selain itu -> AKTIF
 * 2. Default: AKTIF (true) di semua environment agar halaman awal menampilkan
 *    Beranda Gateway IRVITE.ID (E-Tiket & Undangan + Buku Tamu Digital).
 */
export function isTicketingEnabled(): boolean {
  const envVal = process.env.NEXT_PUBLIC_ENABLE_TICKETING;
  if (typeof envVal === 'string' && envVal.trim() !== '') {
    const normalized = envVal.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return process.env.NODE_ENV !== 'production';
}
