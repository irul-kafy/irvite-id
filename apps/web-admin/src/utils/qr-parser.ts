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

    // Origin must match EXACTLY
    if (url.origin !== trustedOrigin) {
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
