/**
 * Validates that an incoming request origin matches the expected web-admin origin.
 * Supports:
 * 1. Configured WEB_ADMIN_ORIGIN (e.g. http://localhost:3001 or https://irvite-admin.vercel.app)
 * 2. Same-host request matching (requesting directly from the active host domain)
 * 3. Official Irvite admin domains (e.g. irvite-admin.vercel.app, irvite-id-57xk.vercel.app)
 */
export function isValidAdminOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';
  if (origin === expectedOrigin) return true;

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    return true;
  }

  if (
    origin === 'https://irvite-admin.vercel.app' ||
    origin === 'https://irvite-id-57xk.vercel.app' ||
    (origin.startsWith('https://irvite-') && origin.endsWith('.vercel.app') && !origin.includes('irvite-id.vercel.app'))
  ) {
    return true;
  }

  return false;
}
