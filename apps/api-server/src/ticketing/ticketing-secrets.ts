import * as crypto from 'crypto';

export const MIN_SECRET_LENGTH = 16;
export const DEFAULT_CHECKIN_OPEN_HOURS_BEFORE = 6;
export const CHECKIN_CLOSE_HOURS_AFTER = 6;

const DEV_QR_FALLBACK = 'dev-test-ticket-qr-secret-key-minimum-32-bytes';
const DEV_WEBHOOK_FALLBACK = 'dev-test-payment-webhook-hmac-secret-32-bytes';
const DEV_CRON_FALLBACK = 'dev-test-ticketing-cron-secret-key-32-bytes';

/**
 * Returns true ONLY when TICKETING_ENABLED=true.
 * When false/unset, ticketing routes return 404 and ticketing secret validation is skipped
 * so wedding invitation deployments without ticketing env vars can boot safely.
 */
export function isTicketingFeatureEnabled(): boolean {
  return (process.env.TICKETING_ENABLED || '').trim().toLowerCase() === 'true';
}

export interface RequireSecretOptions {
  devFallback?: string;
  minLength?: number;
}

/**
 * Reads a secret from process.env[name].
 * Uses devFallback ONLY when NODE_ENV is 'development' or 'test'.
 * In any other NODE_ENV (e.g. 'production', 'staging', or unset), throws a clear Error
 * if missing or shorter than minLength (default 16).
 */
export function requireSecret(
  name: string,
  options: RequireSecretOptions = {},
): string {
  const minLength = options.minLength ?? MIN_SECRET_LENGTH;
  const raw = process.env[name]?.trim();

  if (raw && raw.length > 0) {
    if (raw.length < minLength) {
      throw new Error(
        `Konfigurasi rahasia ${name} tidak valid: panjang minimal ${minLength} karakter.`,
      );
    }
    return raw;
  }

  const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
  if (
    (nodeEnv === 'development' || nodeEnv === 'test') &&
    options.devFallback
  ) {
    const fallback = options.devFallback.trim();
    if (fallback.length < minLength) {
      throw new Error(
        `Konfigurasi devFallback untuk ${name} harus minimal ${minLength} karakter.`,
      );
    }
    return fallback;
  }

  throw new Error(
    `Konfigurasi rahasia wajib ${name} belum diatur (minimal ${minLength} karakter).`,
  );
}

/**
 * Hashes both strings with SHA-256 and compares the 32-byte digests via timingSafeEqual
 * so length differences never throw RangeError or leak length via early return timing.
 */
export function safeCompareSecret(
  provided: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  const hasProvided = typeof provided === 'string' && provided.length > 0;
  const hasExpected = typeof expected === 'string' && expected.length > 0;

  const digestA = crypto
    .createHash('sha256')
    .update(hasProvided ? provided : '', 'utf8')
    .digest();
  const digestB = crypto
    .createHash('sha256')
    .update(hasExpected ? expected : '', 'utf8')
    .digest();

  const equal = crypto.timingSafeEqual(digestA, digestB);
  return hasProvided && hasExpected && equal;
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function getTicketQrSecret(): string {
  return requireSecret('TICKET_QR_SECRET', { devFallback: DEV_QR_FALLBACK });
}

export function getPaymentWebhookSecret(): string {
  return requireSecret('PAYMENT_WEBHOOK_SECRET', {
    devFallback: DEV_WEBHOOK_FALLBACK,
  });
}

export function getTicketingCronSecret(): string {
  return requireSecret('CRON_SECRET', { devFallback: DEV_CRON_FALLBACK });
}

/**
 * Validates TICKET_QR_SECRET, PAYMENT_WEBHOOK_SECRET, and CRON_SECRET at startup
 * ONLY when TICKETING_ENABLED=true. Ensures each >= 16 chars and all 3 are distinct.
 */
export function validateTicketingSecrets(): void {
  if (!isTicketingFeatureEnabled()) {
    return;
  }

  const qrSecret = getTicketQrSecret();
  const webhookSecret = getPaymentWebhookSecret();
  const cronSecret = getTicketingCronSecret();

  if (
    safeCompareSecret(qrSecret, webhookSecret) ||
    safeCompareSecret(qrSecret, cronSecret) ||
    safeCompareSecret(webhookSecret, cronSecret)
  ) {
    throw new Error(
      'Konfigurasi rahasia TICKET_QR_SECRET, PAYMENT_WEBHOOK_SECRET, dan CRON_SECRET wajib berbeda satu sama lain.',
    );
  }
}

export function getCheckInOpenHoursBefore(): number {
  const raw = process.env.CHECKIN_OPEN_HOURS_BEFORE;
  if (!raw || raw.trim() === '') {
    return DEFAULT_CHECKIN_OPEN_HOURS_BEFORE;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 168) {
    return DEFAULT_CHECKIN_OPEN_HOURS_BEFORE;
  }
  return parsed;
}
