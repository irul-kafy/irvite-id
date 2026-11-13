export interface PackageDefinition {
  code: string;
  name: string;
  priceAmount: number; // in IDR (rupiah)
  durationDays: number;
  description: string;
  features: string[];
}

export const PACKAGES: Record<string, PackageDefinition> = {
  SILVER: {
    code: 'SILVER',
    name: 'Paket Silver',
    priceAmount: 99000,
    durationDays: 90, // 3 bulan
    description: 'Solusi undangan esensial nan elegan untuk momen istimewa Anda.',
    features: [
      'Masa aktif 3 bulan setelah acara',
      'Desain responsif semua template',
      'RSVP & Konfirmasi Kehadiran',
      'Peta Lokasi Interaktif',
      'Galeri foto (hingga 5 foto)',
      'Background musik pilihan',
    ],
  },
  GOLD: {
    code: 'GOLD',
    name: 'Paket Gold',
    priceAmount: 199000,
    durationDays: 180, // 6 bulan
    description: 'Pilihan terfavorit dengan fitur lengkap dan scanner kehadiran offline.',
    features: [
      'Masa aktif 6 bulan setelah acara',
      'Semua fitur Paket Silver',
      'QR Code Tamu & Scanner Kehadiran Offline',
      'Buku Tamu Digital & Kartu Ucapan Doa',
      'Love Story & Hitung Mundur Acara',
      'Amplop Digital (Rekening & QRIS)',
      'Galeri foto (hingga 15 foto)',
    ],
  },
  PLATINUM: {
    code: 'PLATINUM',
    name: 'Paket Platinum',
    priceAmount: 349000,
    durationDays: 365, // 1 tahun
    description: 'Pengalaman premium eksklusif dengan masa aktif 1 tahun & dukungan prioritas.',
    features: [
      'Masa aktif 12 bulan (1 tahun) setelah acara',
      'Semua fitur Paket Gold',
      'Broadcast WhatsApp Generator otomatis',
      'Manajemen nomor meja & multi-sesi',
      'Laporan kehadiran real-time & pasca-acara',
      'Prioritas bantuan tim teknis',
    ],
  },
};

export const DEFAULT_PACKAGE = PACKAGES.GOLD;

export function getPackageDefinition(code?: string | null): PackageDefinition {
  if (!code) return DEFAULT_PACKAGE;
  const upper = code.trim().toUpperCase();
  return PACKAGES[upper] || DEFAULT_PACKAGE;
}

export function calculateActiveUntil(
  eventDate: Date,
  packageCode?: string | null,
): Date {
  const pkg = getPackageDefinition(packageCode);
  return new Date(eventDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
}

