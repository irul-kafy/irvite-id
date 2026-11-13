import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IRVITE Scanner Check-In',
    short_name: 'IRVITE Scan',
    description: 'Scanner QR Check-In dan Manajemen Kehadiran Offline IRVITE',
    start_url: '/events',
    display: 'standalone',
    background_color: '#0d1117',
    theme_color: '#0d1117',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

