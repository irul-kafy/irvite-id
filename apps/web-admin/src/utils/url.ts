function remapLegacyPreviewOrigin(baseUrl: string): string {
  if (
    baseUrl.includes('irvite-ez56n3ver') ||
    baseUrl.includes('irvite-id-57xk') ||
    (baseUrl.includes('irvite-') && baseUrl.includes('.vercel.app') && !baseUrl.includes('irvite-id.vercel.app'))
  ) {
    return 'https://irvite-id.vercel.app';
  }
  return baseUrl;
}

export function getInternalApiBaseUrl(): string {
  if (process.env.INTERNAL_API_URL && process.env.INTERNAL_API_URL.trim()) {
    return process.env.INTERNAL_API_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim()) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return 'https://irvite-api.vercel.app';
  }
  return 'http://localhost:3000';
}

export function getCanonicalPublicInvitationUrl(uniqueCode: string): string {
  let baseUrl =
    process.env.PUBLIC_INVITATION_URL ||
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
  if (!baseUrl) {
    const isVercel = Boolean(process.env.VERCEL && process.env.VERCEL !== 'undefined' && process.env.VERCEL !== '0');
    const isProd = process.env.NODE_ENV === 'production' || isVercel;
    if (isProd) {
      baseUrl = 'https://irvite-id.vercel.app';
    } else {
      throw new Error('PUBLIC_INVITATION_URL is not configured');
    }
  }
  baseUrl = remapLegacyPreviewOrigin(baseUrl);

  let urlObj: URL;
  try {
    urlObj = new URL(baseUrl);
  } catch {
    throw new Error('PUBLIC_INVITATION_URL is invalid');
  }

  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error('PUBLIC_INVITATION_URL must use http or https protocol');
  }

  if (urlObj.username || urlObj.password) {
    throw new Error('PUBLIC_INVITATION_URL must not contain credentials');
  }

  const isLocalhost =
    urlObj.hostname === 'localhost' ||
    urlObj.hostname === '127.0.0.1' ||
    urlObj.hostname === '::1' ||
    urlObj.hostname === '[::1]';

  if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:' && !isLocalhost) {
    throw new Error('PUBLIC_INVITATION_URL must use https in production');
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return normalizedBase + '/i/' + uniqueCode;
}

export function getCanonicalPublicEventUrl(slug: string): string {
  let baseUrl =
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN ||
    process.env.PUBLIC_INVITATION_URL;
  if (!baseUrl) {
    const isVercel = Boolean(process.env.VERCEL && process.env.VERCEL !== 'undefined' && process.env.VERCEL !== '0');
    const isProd = process.env.NODE_ENV === 'production' || isVercel;
    if (isProd) {
      baseUrl = 'https://irvite-id.vercel.app';
    } else {
      throw new Error('Public invitation origin is not configured');
    }
  }
  baseUrl = remapLegacyPreviewOrigin(baseUrl);

  let urlObj: URL;
  try {
    urlObj = new URL(baseUrl);
  } catch {
    throw new Error('Public invitation origin is invalid');
  }

  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error('Public invitation origin must use http or https protocol');
  }

  if (urlObj.username || urlObj.password) {
    throw new Error('Public invitation origin must not contain credentials');
  }

  const isLocalhost =
    urlObj.hostname === 'localhost' ||
    urlObj.hostname === '127.0.0.1' ||
    urlObj.hostname === '::1' ||
    urlObj.hostname === '[::1]';

  if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:' && !isLocalhost) {
    throw new Error('Public invitation origin must use https in production');
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanSlug = slug.startsWith('/') ? slug.slice(1) : slug;
  return normalizedBase + '/e/' + cleanSlug;
}

/**
 * Validates and returns the trusted invitation origin matching the canonical URL security contract:
 * - Reads NEXT_PUBLIC_INVITATION_ORIGIN or PUBLIC_INVITATION_URL
 * - Enforces http/https protocol
 * - Disallows credentials in URL
 * - In production, requires HTTPS unless localhost
 * - Returns normalized url.origin (e.g. "https://invitation.example.com")
 * - Returns null if missing or invalid (never silently falls back to localhost in production)
 */
export function getTrustedInvitationOrigin(): string | null {
  let baseUrl =
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN ||
    process.env.PUBLIC_INVITATION_URL;
  if (!baseUrl) {
    return null;
  }

  baseUrl = remapLegacyPreviewOrigin(baseUrl);

  let urlObj: URL;
  try {
    urlObj = new URL(baseUrl);
  } catch {
    return null;
  }

  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    return null;
  }

  if (urlObj.username || urlObj.password) {
    return null;
  }

  const isLocalhost =
    urlObj.hostname === 'localhost' ||
    urlObj.hostname === '127.0.0.1' ||
    urlObj.hostname === '::1' ||
    urlObj.hostname === '[::1]';

  if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:' && !isLocalhost) {
    return null;
  }

  return urlObj.origin;
}

/**
 * Constructs the canonical public URL to a coded template demo route.
 * Resolves against trusted invitation origin (e.g. http://localhost:3002 or https://irvite.id)
 * if configured, or returns null if not configured or invalid (fails closed).
 * Never returns relative demoPath which is unsafe for cross-origin web-admin.
 */
export function getCanonicalTemplateDemoUrl(demoPath: string | null | undefined): string | null {
  if (!demoPath || typeof demoPath !== 'string' || !demoPath.trim()) {
    return null;
  }
  const origin = getTrustedInvitationOrigin();
  if (!origin) {
    return null;
  }
  const trimmed = demoPath.trim();
  const cleanPath = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  return origin + cleanPath;
}
