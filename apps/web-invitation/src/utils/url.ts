export function getPublicInvitationBaseUrl(): string {
  let envUrl = process.env.PUBLIC_INVITATION_URL;
  if (!envUrl || !envUrl.trim()) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      envUrl = 'https://irvite-id.vercel.app';
    } else {
      envUrl = 'http://localhost:3002';
    }
  }

  try {
    const url = new URL(envUrl);
    return url.origin;
  } catch {
    return 'https://irvite-id.vercel.app';
  }
}

export function getCanonicalEventUrl(
  slug: string,
  publicRecipient?: string | null,
): string | null {
  const base = getPublicInvitationBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  if (publicRecipient && publicRecipient.trim()) {
    return `${base}/e/${encodedSlug}?to=${encodeURIComponent(publicRecipient.trim())}`;
  }
  return `${base}/e/${encodedSlug}`;
}

export function getCanonicalInvitationUrl(uniqueCode: string): string | null {
  let envUrl = process.env.PUBLIC_INVITATION_URL;
  if (!envUrl || !envUrl.trim()) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      envUrl = 'https://irvite-id.vercel.app';
    } else {
      envUrl = 'http://localhost:3002';
    }
  }

  try {
    const url = new URL(envUrl);
    
    // HTTP/HTTPS only
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    
    const isLocalhost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1' ||
      url.hostname === '[::1]';

    // In production, enforce HTTPS unless localhost
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:' && !isLocalhost) {
      return null;
    }
    
    // No credentials
    if (url.username || url.password) {
      return null;
    }
    
    // Normalize base origin
    const normalizedBase = url.origin;
    
    return `${normalizedBase}/i/${encodeURIComponent(uniqueCode)}`;
  } catch {
    return null; // Malformed URL
  }
}
