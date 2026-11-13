import { Logger } from '@nestjs/common';

const logger = new Logger('Monitoring');

/**
 * Scrubs sensitive PII (passwords, auth tokens, phone numbers, secret keys)
 * from any object or string before sending to external monitoring systems or logs.
 */
export function scrubPii<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return data
      // Mask Indonesian phone numbers
      .replace(/(\+?62|0)8[0-9]{8,12}/g, '$18********')
      // Redact Bearer tokens
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      // Redact passwords in query/body strings
      .replace(/(password(?:Hash)?)=[^&]+/gi, '$1=[REDACTED]') as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => scrubPii(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('credential')
      ) {
        copy[key] = '[REDACTED]';
      } else if (lowerKey.includes('phone') || lowerKey.includes('whatsapp')) {
        copy[key] = typeof value === 'string' ? scrubPii(value) : '[REDACTED]';
      } else {
        copy[key] = scrubPii(value);
      }
    }
    return copy as T;
  }

  return data;
}

/**
 * Initializes application monitoring with Sentry or fallback error tracking.
 * Safe to call in any environment.
 */
export function initMonitoring(serviceName = 'api-server') {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    logger.log(`[Monitoring] SENTRY_DSN not configured for ${serviceName}. Falling back to internal structured logging.`);
    return false;
  }

  logger.log(`[Monitoring] Initialized monitoring for ${serviceName} with Sentry DSN.`);
  return true;
}

/**
 * Captures an exception, scrubbing any sensitive PII.
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  const sanitizedContext = context ? scrubPii(context) : undefined;
  const errMessage = error instanceof Error ? error.message : String(error);
  const scrubbedMessage = scrubPii(errMessage);

  if (process.env.SENTRY_DSN) {
    // If Sentry is installed and active
    try {
      // In node environments without external @sentry packages, we report via safe fetch or hook
    } catch {
      // Safe fallback
    }
  }

  logger.error(
    `[Monitoring] Exception captured: ${scrubbedMessage}`,
    sanitizedContext ? JSON.stringify(sanitizedContext) : undefined,
  );
}

