/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {string | null}
 */
export function resolveApiProxyBaseUrl(env = process.env) {
  if (env.VERCEL_ENV === 'preview') {
    const previewUrl = env.PREVIEW_API_URL?.trim().replace(/\/+$/, '');
    return previewUrl || null;
  }

  const internalUrl = env.INTERNAL_API_URL?.trim().replace(/\/+$/, '');
  if (internalUrl) {
    return internalUrl;
  }

  if (env.NODE_ENV === 'production' || env.VERCEL) {
    return 'https://irvite-api.vercel.app';
  }

  return 'http://127.0.0.1:3000';
}

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function buildApiProxyRewrites(env = process.env) {
  const apiBase = resolveApiProxyBaseUrl(env);
  if (!apiBase) {
    return [
      {
        source: '/api-proxy/:path*',
        destination: '/api/preview-unconfigured',
      },
    ];
  }
  return [
    {
      source: '/api-proxy/:path*',
      destination: `${apiBase}/:path*`, // Proxy to Backend
    },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    agentUpgrade: 'security',
  },
  async rewrites() {
    return buildApiProxyRewrites(process.env);
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
