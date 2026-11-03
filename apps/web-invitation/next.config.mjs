/** @type {import('next').NextConfig} */
const apiBase =
  process.env.INTERNAL_API_URL ||
  (process.env.NODE_ENV === 'production' || process.env.VERCEL
    ? 'https://irvite-api.vercel.app'
    : 'http://127.0.0.1:3000');

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${apiBase}/:path*`, // Proxy to Backend
      },
    ];
  },
  async headers() {
    const adminOrigin =
      process.env.NEXT_PUBLIC_TRUSTED_ADMIN_ORIGIN ||
      'https://irvite-admin.vercel.app http://localhost:3000 http://localhost:3001';

    return [
      // Preview and Template Demo embed routes: allow framing from trusted admin origin
      {
        source: '/(preview/.*|templates/.*/demo)',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'self' ${adminOrigin} https://irvite-admin.vercel.app https://*.vercel.app http://localhost:3000 http://localhost:3001`,
          },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      // Default headers for all other routes
      {
        source: '/((?!preview|templates/.*/demo).*)',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
