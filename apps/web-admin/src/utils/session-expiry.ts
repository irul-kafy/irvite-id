// This only controls cookie lifetime and optimistic navigation.
// API JWT signature verification remains the authentication authority.
export function remainingSessionSeconds(token: string, now = Date.now()): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const payload: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object' || !('exp' in payload)) return 0;
    const exp = payload.exp;
    if (typeof exp !== 'number' || !Number.isSafeInteger(exp)) return 0;
    return Math.max(0, exp - Math.floor(now / 1000));
  } catch {
    return 0;
  }
}
