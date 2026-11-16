/**
 * IRVITE Feature Flags Configuration
 * 
 * Menentukan apakah modul Tiket & Partnership ditampilkan atau disembunyikan.
 * 
 * Aturan Kerja:
 * 1. Jika disetel secara eksplisit via `process.env.NEXT_PUBLIC_ENABLE_TICKETING`:
 *    - 'true', '1', atau 'yes' -> AKTIF
 *    - 'false', '0', atau 'no'  -> NON-AKTIF
 * 
 * 2. Jika tidak disetel (default):
 *    - Localhost Development (NODE_ENV !== 'production'):
 *      -> AKTIF (true), agar developer bisa leluasa mengembangkan e-tiket, scanner,
 *         dan partnership di localhost tanpa kendala.
 *    - Production Hosting Vercel (NODE_ENV === 'production'):
 *      -> NON-AKTIF (false), agar pengunjung publik ke irvite.id murni hanya melihat
 *         layanan Undangan Digital Pernikahan (semua tiket dan gateway disembunyikan).
 */
export function isTicketingEnabled(): boolean {
  const envVal = process.env.NEXT_PUBLIC_ENABLE_TICKETING;
  if (typeof envVal === 'string' && envVal.trim() !== '') {
    const normalized = envVal.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return process.env.NODE_ENV !== 'production';
}
