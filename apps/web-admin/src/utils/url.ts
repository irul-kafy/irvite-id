export function getCanonicalPublicInvitationUrl(uniqueCode: string): string {
  const baseUrl = process.env.PUBLIC_INVITATION_URL;
  if (!baseUrl) {
    throw new Error('PUBLIC_INVITATION_URL is not configured');
  }

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
  const baseUrl =
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN ||
    process.env.PUBLIC_INVITATION_URL;
  if (!baseUrl) {
    throw new Error('Public invitation origin is not configured');
  }

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
  const baseUrl =
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN ||
    process.env.PUBLIC_INVITATION_URL;
  if (!baseUrl) {
    return null;
  }

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
