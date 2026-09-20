/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://127.0.0.1:3000'}/:path*`, // Proxy to Backend
      },
    ];
  },
  async headers() {
    const adminOrigin = process.env.NEXT_PUBLIC_TRUSTED_ADMIN_ORIGIN || 'http://localhost:3001';

    return [
      // Default headers for all routes
      {
        source: '/((?!preview).*)',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      // Preview route: allow embedding only from the trusted admin origin
      {
        source: '/preview/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          // Allow framing only from admin origin
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${adminOrigin}`,
          },
          // X-Frame-Options does not support per-origin; CSP takes precedence in modern browsers.
          // For legacy browser compatibility, allow SAMEORIGIN is the closest safe approximation.
          // The postMessage origin check is the authoritative security gate.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // No auth/session cookies needed for preview
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
