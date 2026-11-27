import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  resolveApiProxyBaseUrl,
  buildApiProxyRewrites,
} from '../../next.config.mjs';
import { GET, POST } from '../app/api/preview-unconfigured/route';

describe('next.config.mjs API proxy base URL & preview rewrite logic', () => {
  it('returns PREVIEW_API_URL (without trailing slash) when VERCEL_ENV is preview and PREVIEW_API_URL is set', () => {
    const baseUrl = resolveApiProxyBaseUrl({
      VERCEL_ENV: 'preview',
      VERCEL: '1',
      NODE_ENV: 'production',
      PREVIEW_API_URL: 'https://irvite-api-preview.vercel.app/',
    });
    assert.strictEqual(baseUrl, 'https://irvite-api-preview.vercel.app');

    const rewrites = buildApiProxyRewrites({
      VERCEL_ENV: 'preview',
      VERCEL: '1',
      NODE_ENV: 'production',
      PREVIEW_API_URL: 'https://irvite-api-preview.vercel.app/',
    });
    assert.deepStrictEqual(rewrites, [
      {
        source: '/api-proxy/:path*',
        destination: 'https://irvite-api-preview.vercel.app/:path*',
      },
    ]);
  });

  it('never rewrites to production https://irvite-api.vercel.app when VERCEL_ENV is preview and PREVIEW_API_URL is missing', () => {
    const env = {
      VERCEL_ENV: 'preview',
      VERCEL: '1',
      NODE_ENV: 'production',
    };
    const baseUrl = resolveApiProxyBaseUrl(env);
    assert.strictEqual(baseUrl, null);

    const rewrites = buildApiProxyRewrites(env);
    assert.deepStrictEqual(rewrites, [
      {
        source: '/api-proxy/:path*',
        destination: '/api/preview-unconfigured',
      },
    ]);
  });

  it('returns 503 JSON "API preview tidak dikonfigurasi" from /api/preview-unconfigured handler', async () => {
    const getRes = await GET();
    assert.strictEqual(getRes.status, 503);
    const getBody = (await getRes.json()) as { message: string };
    assert.strictEqual(getBody.message, 'API preview tidak dikonfigurasi');

    const postRes = await POST();
    assert.strictEqual(postRes.status, 503);
    const postBody = (await postRes.json()) as { message: string };
    assert.strictEqual(postBody.message, 'API preview tidak dikonfigurasi');
  });

  it('keeps production rewrite to https://irvite-api.vercel.app when VERCEL_ENV is production', () => {
    const baseUrl = resolveApiProxyBaseUrl({
      VERCEL_ENV: 'production',
      VERCEL: '1',
      NODE_ENV: 'production',
    });
    assert.strictEqual(baseUrl, 'https://irvite-api.vercel.app');

    const rewrites = buildApiProxyRewrites({
      VERCEL_ENV: 'production',
      VERCEL: '1',
      NODE_ENV: 'production',
    });
    assert.deepStrictEqual(rewrites, [
      {
        source: '/api-proxy/:path*',
        destination: 'https://irvite-api.vercel.app/:path*',
      },
    ]);
  });

  it('keeps local development rewrite to http://127.0.0.1:3000 and respects INTERNAL_API_URL outside preview', () => {
    assert.strictEqual(
      resolveApiProxyBaseUrl({ NODE_ENV: 'development' }),
      'http://127.0.0.1:3000',
    );
    assert.strictEqual(
      resolveApiProxyBaseUrl({
        NODE_ENV: 'development',
        INTERNAL_API_URL: 'http://localhost:4000/',
      }),
      'http://localhost:4000',
    );
  });
});
