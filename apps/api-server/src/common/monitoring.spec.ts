import { captureException, initMonitoring, scrubPii } from './monitoring';

describe('Monitoring & PII Scrubbing', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('scrubPii', () => {
    it('masks phone numbers in string content', () => {
      const input = 'Kontak tamu: 081234567890 atau +6281987654321.';
      const output = scrubPii(input);
      expect(output).not.toContain('081234567890');
      expect(output).toContain('08********');
    });

    it('redacts Authorization bearer tokens', () => {
      const input = 'Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret';
      const output = scrubPii(input);
      expect(output).toBe('Authorization header: Bearer [REDACTED]');
    });

    it('redacts passwords, secrets, and auth tokens in nested objects', () => {
      const input = {
        user: 'admin',
        password: 'supersecretpassword123',
        authSecret: 'my-jwt-secret-key',
        phoneNumber: '081299887766',
        details: {
          token: 'token-xyz',
          normalField: 'all-good',
        },
      };

      const scrubbed = scrubPii(input);
      expect(scrubbed.password).toBe('[REDACTED]');
      expect(scrubbed.authSecret).toBe('[REDACTED]');
      expect(scrubbed.phoneNumber).not.toContain('081299887766');
      expect(scrubbed.details.token).toBe('[REDACTED]');
      expect(scrubbed.details.normalField).toBe('all-good');
    });

    it('handles null, undefined, and primitive types gracefully', () => {
      expect(scrubPii(null)).toBeNull();
      expect(scrubPii(undefined)).toBeUndefined();
      expect(scrubPii(12345)).toBe(12345);
    });
  });

  describe('initMonitoring', () => {
    it('returns false when SENTRY_DSN is absent', () => {
      delete process.env.SENTRY_DSN;
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      expect(initMonitoring()).toBe(false);
    });

    it('returns true when SENTRY_DSN is present', () => {
      process.env.SENTRY_DSN = 'https://dummy@sentry.io/12345';
      expect(initMonitoring()).toBe(true);
    });
  });

  describe('captureException', () => {
    it('executes without throwing and sanitizes context', () => {
      expect(() => {
        captureException(new Error('Test error with 081234567890'), {
          userPhone: '081234567890',
          password: 'secret-pass-value',
        });
      }).not.toThrow();
    });
  });
});

