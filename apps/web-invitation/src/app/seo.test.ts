import test from 'node:test';
import assert from 'node:assert';
import robots from './robots';
import sitemap from './sitemap';
import { buildInvitationMetadata } from '../utils/invitation-metadata';
import { getPublicInvitationBaseUrl, getCanonicalInvitationUrl, getCanonicalEventUrl } from '../utils/url';
import { APPROVED_CATALOG_TEMPLATES } from '../catalog/template-catalog.registry';

test('SEO & Guest Privacy Contract', async (t) => {
  const origEnv = process.env.PUBLIC_INVITATION_URL;
  const origOrigin = process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
  const origNodeEnv = process.env.NODE_ENV;
  const origVercel = process.env.VERCEL;

  t.afterEach(() => {
    if (origEnv !== undefined) process.env.PUBLIC_INVITATION_URL = origEnv;
    else delete process.env.PUBLIC_INVITATION_URL;

    if (origOrigin !== undefined) process.env.NEXT_PUBLIC_INVITATION_ORIGIN = origOrigin;
    else delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;

    if (origNodeEnv !== undefined) (process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv;
    else delete (process.env as Record<string, string | undefined>).NODE_ENV;

    if (origVercel !== undefined) process.env.VERCEL = origVercel;
    else delete process.env.VERCEL;
  });

  await t.test('getPublicInvitationBaseUrl defaults to https://irvite.id in production', () => {
    delete process.env.PUBLIC_INVITATION_URL;
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL;

    assert.strictEqual(getPublicInvitationBaseUrl(), 'https://irvite.id');
  });

  await t.test('robots.txt disallows crawler access to private invitations, client portal, and API', () => {
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    process.env.PUBLIC_INVITATION_URL = 'https://irvite.id';

    const robotsConfig = robots();
    assert.strictEqual(robotsConfig.sitemap, 'https://irvite.id/sitemap.xml');

    const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
    assert.ok(rules.length >= 1, 'Should have at least one rule set');

    for (const rule of rules) {
      assert.ok(rule.disallow, 'Rule must define disallowed paths');
      const disallows = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
      assert.ok(disallows.includes('/i/'), 'Must disallow personal invitations /i/');
      assert.ok(disallows.includes('/e/'), 'Must disallow public invitations /e/');
      assert.ok(disallows.includes('/kelola/'), 'Must disallow client portal /kelola/');
      assert.ok(disallows.includes('/api/'), 'Must disallow internal API endpoints /api/');

      const allows = Array.isArray(rule.allow) ? rule.allow : [rule.allow];
      assert.ok(allows.includes('/'), 'Must allow landing page /');
      assert.ok(allows.includes('/templates'), 'Must allow template catalog /templates');
      assert.ok(allows.includes('/templates/*/demo'), 'Must allow public template demos');
    }
  });

  await t.test('sitemap.xml includes root, catalog, and all public template demos', () => {
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    process.env.PUBLIC_INVITATION_URL = 'https://irvite.id';

    const sitemapEntries = sitemap();
    const urls = sitemapEntries.map((e) => e.url);

    assert.ok(urls.includes('https://irvite.id'), 'Sitemap must contain root URL');
    assert.ok(urls.includes('https://irvite.id/templates'), 'Sitemap must contain /templates URL');

    assert.ok(APPROVED_CATALOG_TEMPLATES.length > 0, 'Catalog templates must not be empty');

    for (const tpl of APPROVED_CATALOG_TEMPLATES) {
      assert.ok(
        urls.includes(`https://irvite.id/templates/${tpl.slug}/demo`),
        `Sitemap must contain demo URL for ${tpl.slug}`
      );
    }
  });

  await t.test('buildInvitationMetadata explicitly marks invitations as noindex for Google search', () => {
    const mockData = {
      guest: { id: 'g-1', name: 'Budi Santoso', isPublicRecipient: false },
      event: {
        id: 'evt-1',
        title: 'The Wedding of Romeo & Juliet',
        eventDate: '2026-12-25T10:00:00.000Z',
        locationDetails: 'Jakarta',
        description: 'Selamat datang',
      },
      template: {
        themeCode: 'sekar-kedaton',
      },
      media: [],
    } as any;

    const meta = buildInvitationMetadata(mockData, {
      uniqueCode: 'xyz-code-123',
    });

    // Robots metadata must prohibit search engine indexing
    assert.deepStrictEqual(meta.robots, {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    });

    // But OpenGraph metadata for WhatsApp/Telegram preview must still be fully populated!
    const ogTitle = typeof meta.openGraph?.title === 'string' ? meta.openGraph.title : '';
    assert.ok(ogTitle.includes('Budi Santoso'));
    assert.ok(ogTitle.includes('The Wedding of Romeo & Juliet'));
  });

  await t.test('canonical URL helpers default to irvite.id in production', () => {
    delete process.env.PUBLIC_INVITATION_URL;
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';

    const invUrl = getCanonicalInvitationUrl('code-abc');
    assert.strictEqual(invUrl, 'https://irvite.id/i/code-abc');

    const evtUrl = getCanonicalEventUrl('romeo-juliet', 'Pak RT');
    assert.strictEqual(evtUrl, 'https://irvite.id/e/romeo-juliet?to=Pak%20RT');
  });
});
