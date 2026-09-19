import test from 'node:test';
import assert from 'node:assert';
import {
  getCanonicalPublicInvitationUrl,
  getCanonicalPublicEventUrl,
  getTrustedInvitationOrigin,
  getCanonicalTemplateDemoUrl,
} from './url';

test('getCanonicalPublicInvitationUrl', async (t) => {
  const originalEnv = process.env.PUBLIC_INVITATION_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  t.afterEach(() => {
    process.env.PUBLIC_INVITATION_URL = originalEnv;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = originalNodeEnv;
  });

  await t.test('constructs valid URL correctly', () => {
    process.env.PUBLIC_INVITATION_URL = 'https://invites.example.com';
    assert.strictEqual(getCanonicalPublicInvitationUrl('xyz123'), 'https://invites.example.com/i/xyz123');
  });

  await t.test('normalizes trailing slash', () => {
    process.env.PUBLIC_INVITATION_URL = 'https://invites.example.com/';
    assert.strictEqual(getCanonicalPublicInvitationUrl('xyz123'), 'https://invites.example.com/i/xyz123');
  });

  await t.test('throws if env var is missing', () => {
    delete process.env.PUBLIC_INVITATION_URL;
    assert.throws(() => getCanonicalPublicInvitationUrl('xyz123'), /PUBLIC_INVITATION_URL is not configured/);
  });

  await t.test('throws if URL is invalid', () => {
    process.env.PUBLIC_INVITATION_URL = 'not-a-url';
    assert.throws(() => getCanonicalPublicInvitationUrl('xyz123'), /invalid/);
  });

  await t.test('throws if protocol is not http/https', () => {
    process.env.PUBLIC_INVITATION_URL = 'ftp://invites.example.com';
    assert.throws(() => getCanonicalPublicInvitationUrl('xyz123'), /must use http or https/);
  });

  await t.test('throws if URL contains credentials', () => {
    process.env.PUBLIC_INVITATION_URL = 'https://user:pass@invites.example.com';
    assert.throws(() => getCanonicalPublicInvitationUrl('xyz123'), /must not contain credentials/);
  });

  await t.test('throws if http used in production', () => {
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    process.env.PUBLIC_INVITATION_URL = 'http://invites.example.com';
    assert.throws(() => getCanonicalPublicInvitationUrl('xyz123'), /must use https in production/);
  });
});

test('getCanonicalPublicEventUrl', async (t) => {
  const originalOrigin = process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
  const originalUrl = process.env.PUBLIC_INVITATION_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  t.afterEach(() => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = originalOrigin;
    process.env.PUBLIC_INVITATION_URL = originalUrl;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = originalNodeEnv;
  });

  await t.test('constructs valid event slug URL using NEXT_PUBLIC_INVITATION_ORIGIN', () => {
    delete process.env.PUBLIC_INVITATION_URL;
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://irvite.id';
    assert.strictEqual(getCanonicalPublicEventUrl('sarah-michael'), 'https://irvite.id/e/sarah-michael');
  });

  await t.test('normalizes trailing slash and leading slash in slug', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'http://localhost:3002/';
    assert.strictEqual(getCanonicalPublicEventUrl('/sarah-michael'), 'http://localhost:3002/e/sarah-michael');
  });

  await t.test('falls back to PUBLIC_INVITATION_URL if NEXT_PUBLIC not set', () => {
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    process.env.PUBLIC_INVITATION_URL = 'https://invitation.example.com';
    assert.strictEqual(getCanonicalPublicEventUrl('wedding-demo'), 'https://invitation.example.com/e/wedding-demo');
  });

  await t.test('throws if both origin env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    delete process.env.PUBLIC_INVITATION_URL;
    assert.throws(() => getCanonicalPublicEventUrl('test'), /Public invitation origin is not configured/);
  });

  await t.test('throws if http used in production', () => {
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'http://irvite.id';
    assert.throws(() => getCanonicalPublicEventUrl('test'), /must use https in production/);
  });
});

test('getTrustedInvitationOrigin', async (t) => {
  const originalOrigin = process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
  const originalUrl = process.env.PUBLIC_INVITATION_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  t.afterEach(() => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = originalOrigin;
    process.env.PUBLIC_INVITATION_URL = originalUrl;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = originalNodeEnv;
  });

  await t.test('returns valid origin for HTTPS URL', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://invitation.example.com';
    assert.strictEqual(getTrustedInvitationOrigin(), 'https://invitation.example.com');
  });

  await t.test('returns origin for localhost in non-production', () => {
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'http://localhost:3002/some/path';
    assert.strictEqual(getTrustedInvitationOrigin(), 'http://localhost:3002');
  });

  await t.test('returns null when env vars are missing (no silent localhost fallback)', () => {
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    delete process.env.PUBLIC_INVITATION_URL;
    assert.strictEqual(getTrustedInvitationOrigin(), null);
  });

  await t.test('returns null when URL is malformed', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'not-a-valid-url';
    assert.strictEqual(getTrustedInvitationOrigin(), null);
  });

  await t.test('returns null when protocol is not http/https', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'ws://invitation.example.com';
    assert.strictEqual(getTrustedInvitationOrigin(), null);
  });

  await t.test('returns null when credentials are in URL', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://user:pass@invitation.example.com';
    assert.strictEqual(getTrustedInvitationOrigin(), null);
  });

  await t.test('returns null when HTTP is used in production for non-localhost', () => {
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'http://invitation.example.com';
    assert.strictEqual(getTrustedInvitationOrigin(), null);
  });

  await t.test('allows localhost in production if explicitly configured', () => {
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'http://localhost:3002';
    assert.strictEqual(getTrustedInvitationOrigin(), 'http://localhost:3002');
  });
});

test('getCanonicalTemplateDemoUrl', async (t) => {
  const originalOrigin = process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
  const originalUrl = process.env.PUBLIC_INVITATION_URL;
  const originalEnv = process.env.NODE_ENV;

  t.afterEach(() => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = originalOrigin;
    process.env.PUBLIC_INVITATION_URL = originalUrl;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = originalEnv;
  });

  await t.test('trusted invitation origin: https://example-invitation.test + /templates/ivory-garden/demo -> https://example-invitation.test/templates/ivory-garden/demo', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://example-invitation.test';
    assert.strictEqual(
      getCanonicalTemplateDemoUrl('/templates/ivory-garden/demo'),
      'https://example-invitation.test/templates/ivory-garden/demo'
    );
  });

  await t.test('normalizes missing leading slash in demoPath', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'http://localhost:3002';
    assert.strictEqual(
      getCanonicalTemplateDemoUrl('templates/serene-garden/demo'),
      'http://localhost:3002/templates/serene-garden/demo'
    );
  });

  await t.test('missing invitation origin: returns null (fails closed, NOT admin-relative fallback)', () => {
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    delete process.env.PUBLIC_INVITATION_URL;
    assert.strictEqual(
      getCanonicalTemplateDemoUrl('/templates/sunda-puspa/demo'),
      null
    );
  });

  await t.test('unsafe or malformed origin handling continues following security rules (returns null)', () => {
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'http://insecure-in-prod.test';
    assert.strictEqual(getCanonicalTemplateDemoUrl('/templates/ivory-garden/demo'), null);

    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'not-a-valid-url';
    assert.strictEqual(getCanonicalTemplateDemoUrl('/templates/ivory-garden/demo'), null);
  });

  await t.test('fails safely with null for empty, whitespace, or non-string input', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://example-invitation.test';
    assert.strictEqual(getCanonicalTemplateDemoUrl(''), null);
    assert.strictEqual(getCanonicalTemplateDemoUrl('   '), null);
    assert.strictEqual(getCanonicalTemplateDemoUrl(null), null);
    assert.strictEqual(getCanonicalTemplateDemoUrl(undefined), null);
  });
});
