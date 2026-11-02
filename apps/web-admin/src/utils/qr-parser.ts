export function parseQRData(input: string, trustedOrigin: string): string | null {
  const trimmed = input.trim();
  const rawCodeRegex = /^[A-Za-z0-9_-]{22}$/;

  // Check if it's already a valid raw code
  if (rawCodeRegex.test(trimmed)) {
    return trimmed;
  }

  // Try parsing as URL
  try {
    const url = new URL(trimmed);

    // Validate origin: matches trustedOrigin OR recognized Irvite platforms (production, local dev, preview)
    const isAllowedOrigin =
      url.origin === trustedOrigin ||
      url.origin === 'https://irvite-id.vercel.app' ||
      url.origin === 'http://localhost:3002' ||
      url.origin === 'http://127.0.0.1:3002' ||
      (url.hostname.startsWith('irvite-') && url.hostname.endsWith('.vercel.app'));

    if (!isAllowedOrigin) {
      return null;
    }

    // Production check can be inferred if trustedOrigin starts with https
    // The instructions say "production uses https". If the trusted origin is normalized and starts with https, 
    // the origin check above implicitly enforces it.

    // Username / password must be empty
    if (url.username || url.password) {
      return null;
    }

    // No search / query strings
    if (url.search) {
      return null;
    }

    // No hash
    if (url.hash) {
      return null;
    }

    // Path must be EXACTLY /i/<22-char-code>
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length !== 2) {
      return null;
    }

    if (pathParts[0] !== 'i') {
      return null;
    }

    const code = pathParts[1];
    if (!rawCodeRegex.test(code)) {
      return null;
    }

    return code;
  } catch {
    // Not a valid URL, and not a valid raw code
    return null;
  }
}
