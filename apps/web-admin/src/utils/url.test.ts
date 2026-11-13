function setOrDeleteEnv(key: string, val: string | undefined) {
  if (val === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = val;
  }
}

﻿import test from 'node:test';
import assert from 'node:assert';
import {
  getInternalApiBaseUrl,
  getCanonicalPublicInvitationUrl,
  getCanonicalPublicEventUrl,
  getTrustedInvitationOrigin,
  getCanonicalTemplateDemoUrl,
  getCanonicalClientPortalUrl,
} from './url';

test('getInternalApiBaseUrl', async (t) => {
  const origInternal = process.env.INTERNAL_API_URL;
  const origNextPublic = process.env.NEXT_PUBLIC_API_URL;
  const origNodeEnv = process.env.NODE_ENV;
  const origVercel = process.env.VERCEL;

  t.afterEach(() => {
    setOrDeleteEnv('INTERNAL_API_URL', origInternal);
    setOrDeleteEnv('NEXT_PUBLIC_API_URL', origNextPublic);
    setOrDeleteEnv('NODE_ENV', origNodeEnv);
    setOrDeleteEnv('VERCEL', origVercel);
  });

  await t.test('defaults to localhost:3000 in dev when unset', () => {
    delete process.env.INTERNAL_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.VERCEL;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'development';
    assert.strictEqual(getInternalApiBaseUrl(), 'http://localhost:3000');
  });

  await t.test('uses INTERNAL_API_URL when set', () => {
    process.env.INTERNAL_API_URL = 'https://custom-api.example.com/';
    assert.strictEqual(getInternalApiBaseUrl(), 'https://custom-api.example.com');
  });

  await t.test('strips accidental trailing /api/v1 from INTERNAL_API_URL', () => {
    process.env.INTERNAL_API_URL = 'https://custom-api.example.com/api/v1/';
    assert.strictEqual(getInternalApiBaseUrl(), 'https://custom-api.example.com');
  });

  await t.test('falls back to irvite-api.vercel.app in production', () => {
    delete process.env.INTERNAL_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    assert.strictEqual(getInternalApiBaseUrl(), 'https://irvite-api.vercel.app');
  });
});

test('getCanonicalPublicInvitationUrl', async (t) => {
  const originalEnv = process.env.PUBLIC_INVITATION_URL;
  const originalOrigin = process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
  const originalNodeEnv = process.env.NODE_ENV;

  t.afterEach(() => {
    setOrDeleteEnv('PUBLIC_INVITATION_URL', originalEnv);
    setOrDeleteEnv('NEXT_PUBLIC_INVITATION_ORIGIN', originalOrigin);
    setOrDeleteEnv('NODE_ENV', originalNodeEnv);
  });

  await t.test('constructs valid URL correctly', () => {
    process.env.PUBLIC_INVITATION_URL = 'https://invites.example.com';
    assert.strictEqual(getCanonicalPublicInvitationUrl('xyz123'), 'https://invites.example.com/i/xyz123');
  });

  await t.test('normalizes trailing slash', () => {
    process.env.PUBLIC_INVITATION_URL = 'https://invites.example.com/';
    assert.strictEqual(getCanonicalPublicInvitationUrl('xyz123'), 'https://invites.example.com/i/xyz123');
  });

  await t.test('falls back to NEXT_PUBLIC_INVITATION_ORIGIN when PUBLIC_INVITATION_URL is missing', () => {
    delete process.env.PUBLIC_INVITATION_URL;
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://invites.example.com';
    assert.strictEqual(getCanonicalPublicInvitationUrl('xyz123'), 'https://invites.example.com/i/xyz123');
  });

  await t.test('throws if env var is missing in development', () => {
    delete process.env.PUBLIC_INVITATION_URL;
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'development';
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
    setOrDeleteEnv('NEXT_PUBLIC_INVITATION_ORIGIN', originalOrigin);
    setOrDeleteEnv('PUBLIC_INVITATION_URL', originalUrl);
    setOrDeleteEnv('NODE_ENV', originalNodeEnv);
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
    setOrDeleteEnv('NEXT_PUBLIC_INVITATION_ORIGIN', originalOrigin);
    setOrDeleteEnv('PUBLIC_INVITATION_URL', originalUrl);
    setOrDeleteEnv('NODE_ENV', originalNodeEnv);
  });

  await t.test('remaps ephemeral Vercel preview deployment URLs to canonical production invitation origin', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://irvite-ez56n3ver-khoirul2.vercel.app';
    assert.strictEqual(getTrustedInvitationOrigin(), 'https://irvite-id.vercel.app');

    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://irvite-preview-123.vercel.app';
    assert.strictEqual(getTrustedInvitationOrigin(), 'https://irvite-id.vercel.app');
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
    setOrDeleteEnv('NEXT_PUBLIC_INVITATION_ORIGIN', originalOrigin);
    setOrDeleteEnv('PUBLIC_INVITATION_URL', originalUrl);
    setOrDeleteEnv('NODE_ENV', originalEnv);
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

test('getCanonicalClientPortalUrl', async (t) => {
  const origNextPublic = process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
  const origPublic = process.env.PUBLIC_INVITATION_URL;
  const origVercel = process.env.VERCEL;
  const origNodeEnv = process.env.NODE_ENV;

  t.afterEach(() => {
    setOrDeleteEnv('NEXT_PUBLIC_INVITATION_ORIGIN', origNextPublic);
    setOrDeleteEnv('PUBLIC_INVITATION_URL', origPublic);
    setOrDeleteEnv('VERCEL', origVercel);
    setOrDeleteEnv('NODE_ENV', origNodeEnv);
  });

  await t.test('constructs valid portal URL with eventId and clientKey in dev', () => {
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    delete process.env.PUBLIC_INVITATION_URL;
    delete process.env.VERCEL;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'development';

    const url = getCanonicalClientPortalUrl('evt-123', 'key-abc');
    assert.strictEqual(url, 'http://localhost:3002/kelola/evt-123~key-abc');
  });

  await t.test('uses NEXT_PUBLIC_INVITATION_ORIGIN when specified', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://custom-invitation.com';
    const url = getCanonicalClientPortalUrl('evt-456', 'key-xyz');
    assert.strictEqual(url, 'https://custom-invitation.com/kelola/evt-456~key-xyz');
  });

  await t.test('remaps legacy preview domains', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://irvite-ez56n3ver.vercel.app';
    const url = getCanonicalClientPortalUrl('evt-789', 'key-999');
    assert.strictEqual(url, 'https://irvite-id.vercel.app/kelola/evt-789~key-999');
  });
});
