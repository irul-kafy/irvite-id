import { NotFoundException } from '@nestjs/common';
import { TicketingEnabledMiddleware } from './ticketing-enabled.middleware';
import {
  isTicketingFeatureEnabled,
  requireSecret,
  safeCompareSecret,
  validateTicketingSecrets,
} from './ticketing-secrets';

describe('ticketing-secrets & TICKETING_ENABLED gate', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('compares secrets safely with SHA-256 + timingSafeEqual even when lengths differ', () => {
    expect(
      safeCompareSecret('my-secret-key-123456', 'my-secret-key-123456'),
    ).toBe(true);
    expect(
      safeCompareSecret('short', 'a-much-longer-secret-string-value'),
    ).toBe(false);
    expect(safeCompareSecret('', '')).toBe(false);
    expect(safeCompareSecret(undefined, 'valid-secret-123456')).toBe(false);
  });

  it('uses devFallback ONLY when NODE_ENV is development or test, and fails in production when missing or < 16 chars', () => {
    delete process.env.TICKET_QR_SECRET;

    process.env.NODE_ENV = 'development';
    expect(
      requireSecret('TICKET_QR_SECRET', {
        devFallback: 'dev-fallback-secret-minimum-16',
      }),
    ).toBe('dev-fallback-secret-minimum-16');

    process.env.NODE_ENV = 'test';
    expect(
      requireSecret('TICKET_QR_SECRET', {
        devFallback: 'dev-fallback-secret-minimum-16',
      }),
    ).toBe('dev-fallback-secret-minimum-16');

    process.env.NODE_ENV = 'production';
    expect(() =>
      requireSecret('TICKET_QR_SECRET', {
        devFallback: 'dev-fallback-secret-minimum-16',
      }),
    ).toThrow(/TICKET_QR_SECRET/);

    process.env.TICKET_QR_SECRET = 'too-short';
    expect(() =>
      requireSecret('TICKET_QR_SECRET', {
        devFallback: 'dev-fallback-secret-minimum-16',
      }),
    ).toThrow(/minimal 16 karakter/);
  });

  it('allows wedding production boot WITHOUT ticketing secrets when TICKETING_ENABLED is not true, and returns 404 on ticketing routes', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TICKETING_ENABLED;
    delete process.env.TICKET_QR_SECRET;
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;

    expect(isTicketingFeatureEnabled()).toBe(false);
    // Must NOT throw when TICKETING_ENABLED is unset/false
    expect(() => validateTicketingSecrets()).not.toThrow();

    const middleware = new TicketingEnabledMiddleware();
    expect(() => middleware.use({} as never, {} as never, jest.fn())).toThrow(
      NotFoundException,
    );
  });

  it('fails startup validation in production when TICKETING_ENABLED=true and secrets are missing or identical', () => {
    process.env.NODE_ENV = 'production';
    process.env.TICKETING_ENABLED = 'true';
    delete process.env.TICKET_QR_SECRET;
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;

    expect(() => validateTicketingSecrets()).toThrow(/TICKET_QR_SECRET/);

    // Identical secrets must also fail startup
    process.env.TICKET_QR_SECRET = 'same-production-secret-1234567890';
    process.env.PAYMENT_WEBHOOK_SECRET = 'same-production-secret-1234567890';
    process.env.CRON_SECRET = 'distinct-cron-secret-key-1234567890';

    expect(() => validateTicketingSecrets()).toThrow(/berbeda satu sama lain/);

    // Three distinct >= 16 char secrets pass startup validation
    process.env.PAYMENT_WEBHOOK_SECRET = 'distinct-webhook-secret-1234567890';
    expect(() => validateTicketingSecrets()).not.toThrow();
  });
});
