/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {string | null}
 */
export function resolveAdminApiBaseUrl(env = process.env) {
  if (env.VERCEL_ENV === 'preview') {
    const previewUrl = env.PREVIEW_API_URL?.trim()
      .replace(/\/+$/, '')
      .replace(/\/api\/v1\/?$/, '');
    if (!previewUrl || previewUrl === 'https://irvite-api.vercel.app') {
      return null;
    }
    return previewUrl;
  }
  const internalUrl = env.INTERNAL_API_URL?.trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1\/?$/, '');
  if (internalUrl) {
    return internalUrl;
  }
  const nextPublicUrl = env.NEXT_PUBLIC_API_URL?.trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1\/?$/, '');
  if (nextPublicUrl) {
    return nextPublicUrl;
  }
  if (env.NODE_ENV === 'production' || env.VERCEL) {
    return 'https://irvite-api.vercel.app';
  }
  return 'http://localhost:3000';
}

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function buildAdminPreviewRewrites(env = process.env) {
  if (env.VERCEL_ENV === 'preview' && !resolveAdminApiBaseUrl(env)) {
    return {
      beforeFiles: [
        {
          source: '/api/:path((?!preview-unconfigured$).*)',
          destination: '/api/preview-unconfigured',
        },
      ],
    };
  }
  return {
    beforeFiles: [],
  };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return buildAdminPreviewRewrites(process.env);
  },
  async redirects() {
    return [
      {
        source: '/templates/:slug/demo',
        destination: 'https://irvite-id.vercel.app/templates/:slug/demo',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
