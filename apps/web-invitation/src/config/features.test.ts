import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isTicketingEnabled } from './features';

describe('Feature Flags Contract: isTicketingEnabled', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_TICKETING;
  const originalNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(val: string | undefined) {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = val;
  }

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_TICKETING = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_ENABLE_TICKETING;
    }
    setNodeEnv(originalNodeEnv);
  });

  it('returns true when NEXT_PUBLIC_ENABLE_TICKETING is "true", "1", or "yes"', () => {
    process.env.NEXT_PUBLIC_ENABLE_TICKETING = 'true';
    assert.strictEqual(isTicketingEnabled(), true);

    process.env.NEXT_PUBLIC_ENABLE_TICKETING = '1';
    assert.strictEqual(isTicketingEnabled(), true);

    process.env.NEXT_PUBLIC_ENABLE_TICKETING = 'yes';
    assert.strictEqual(isTicketingEnabled(), true);
  });

  it('returns false when NEXT_PUBLIC_ENABLE_TICKETING is "false", "0", or "no"', () => {
    process.env.NEXT_PUBLIC_ENABLE_TICKETING = 'false';
    assert.strictEqual(isTicketingEnabled(), false);

    process.env.NEXT_PUBLIC_ENABLE_TICKETING = '0';
    assert.strictEqual(isTicketingEnabled(), false);

    process.env.NEXT_PUBLIC_ENABLE_TICKETING = 'no';
    assert.strictEqual(isTicketingEnabled(), false);
  });

  it('defaults to false in production hosting (NODE_ENV=production) when flag is unset', () => {
    delete process.env.NEXT_PUBLIC_ENABLE_TICKETING;
    setNodeEnv('production');
    assert.strictEqual(isTicketingEnabled(), false, 'Must be disabled on production hosting by default');
  });

  it('defaults to true in development (NODE_ENV=development) when flag is unset', () => {
    delete process.env.NEXT_PUBLIC_ENABLE_TICKETING;
    setNodeEnv('development');
    assert.strictEqual(isTicketingEnabled(), true, 'Must be enabled on localhost development by default');
  });
});
