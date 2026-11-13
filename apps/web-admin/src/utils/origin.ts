/**
 * Validates that an incoming request origin matches the expected web-admin origin.
 * Supports:
 * 1. Configured WEB_ADMIN_ORIGIN (e.g. http://localhost:3001 or https://irvite-admin.vercel.app)
 * 2. Same-host request matching (requesting directly from the active host domain via host / x-forwarded-host)
 * 3. Official Irvite admin domains (e.g. irvite-admin.vercel.app, irvite-id-57xk.vercel.app, irvite.id, *.irvite.id)
 * 4. Localhost and development loopback origins
 */
export function isValidAdminOrigin(request: Request): boolean {
  // Same-origin browser fetch requests often omit Origin header on GET
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin') {
    return true;
  }

  let origin = request.headers.get('origin');
  if (!origin) {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        origin = new URL(referer).origin;
      } catch {
        origin = null;
      }
    }
  }

  if (!origin) return false;

  const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';
  if (origin === expectedOrigin) return true;

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const h = originUrl.hostname.toLowerCase();

    // Local development loopback
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]') {
      return true;
    }

    // Irvite domains & subdomains
    if (h === 'irvite.id' || h.endsWith('.irvite.id')) {
      return true;
    }

    // Official Vercel admin and preview deployments (excluding public invitation app irvite-id.vercel.app)
    if (
      h === 'irvite-admin.vercel.app' ||
      h === 'irvite-id-57xk.vercel.app' ||
      (h.startsWith('irvite-') && h.endsWith('.vercel.app') && h !== 'irvite-id.vercel.app')
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
