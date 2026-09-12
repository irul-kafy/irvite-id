/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, prefer-rest-params */
import test, { mock } from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

const origRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function(id: string) {
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: (name: string) => name === 'auth_token' ? { value: 'smoke-session-token' } : undefined,
        delete: () => {}
      })
    };
  }
  return origRequire.apply(this, arguments);
};

const { GET: TemplatesGet, POST: TemplatesPost } = require('./route');
const { GET: TemplateDetailGet, PATCH: TemplateDetailPatch } = require('./[templateId]/route');
const { GET: AuthMeGet } = require('../auth/me/route');

test('Controlled BFF Product Smoke (Mocked Upstream Flow)', async (t) => {
  const storedTemplates = new Map<string, any>();

  // Upstream mock dispatcher
  mock.method(global, 'fetch', async (url: string, init: RequestInit = {}) => {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const method = init.method || 'GET';
    const authHeader = (init.headers as any)?.Authorization || (init.headers as any)?.authorization;

    assert.strictEqual(authHeader, 'Bearer smoke-session-token', 'Bearer token must be forwarded from cookie');

    // 1. Auth Me
    if (pathname === '/api/v1/auth/me') {
      return new Response(JSON.stringify({ id: 'user-super', email: 'super@smoke.test', role: 'SUPER_ADMIN' }), { status: 200 });
    }

    // 2. Templates Collection
    if (pathname === '/templates') {
      if (method === 'POST') {
        const body = JSON.parse(init.body as string);
        assert.strictEqual(body.themeCode, 'GENERIC');
        assert.strictEqual(body.config.version, 1);
        const newId = `tpl-${Date.now()}`;
        const created = {
          id: newId,
          name: body.name,
          themeCode: body.themeCode,
          config: body.config,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        storedTemplates.set(newId, created);
        return new Response(JSON.stringify(created), { status: 201 });
      }

      if (method === 'GET') {
        const page = parseInt(parsedUrl.searchParams.get('page') || '1', 10);
        const limit = parseInt(parsedUrl.searchParams.get('limit') || '10', 10);
        const list = Array.from(storedTemplates.values());
        return new Response(JSON.stringify({ data: list, meta: { total: list.length, page, limit } }), { status: 200 });
      }
    }

    // 3. Template Detail
    if (pathname.startsWith('/templates/')) {
      const id = pathname.replace('/templates/', '');
      const existing = storedTemplates.get(id);

      if (method === 'GET') {
        if (!existing) return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
        return new Response(JSON.stringify(existing), { status: 200 });
      }

      if (method === 'PATCH') {
        if (!existing) return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
        const body = JSON.parse(init.body as string);
        const updated = {
          ...existing,
          name: body.name !== undefined ? body.name : existing.name,
          config: body.config !== undefined ? body.config : existing.config,
          updatedAt: new Date().toISOString(),
        };
        storedTemplates.set(id, updated);
        return new Response(JSON.stringify(updated), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
  });

  try {
    let createdTemplateId = '';

    // Step 1: Check Auth / Me via BFF
    await t.test('Step 1: GET /api/auth/me returns SUPER_ADMIN role', async () => {
      const res = await AuthMeGet();
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.role, 'SUPER_ADMIN');
    });

    // Step 2: POST /api/templates via BFF
    await t.test('Step 2: POST /api/templates creates Template with Complete V1 config', async () => {
      const v1Config = {
        version: 1,
        theme: {
          primaryColor: '#1c1917',
          secondaryColor: '#78716c',
          backgroundColor: '#fafaf9',
          textColor: '#292524',
        },
        typography: {
          headingFont: 'PLAYFAIR_DISPLAY',
          bodyFont: 'LORA',
        },
        sections: [
          { id: 'hero', enabled: true, order: 1, variant: 'default' },
          { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
          { id: 'greeting', enabled: true, order: 3, variant: 'default' },
        ],
      };

      const req = new Request('http://localhost/api/templates', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3001',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Smoke Gold Wedding',
          themeCode: 'GENERIC',
          config: v1Config,
        }),
      });

      const res = await TemplatesPost(req);
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.ok(data.id);
      assert.strictEqual(data.name, 'Smoke Gold Wedding');
      assert.strictEqual(data.themeCode, 'GENERIC');
      assert.deepStrictEqual(data.config, v1Config);
      createdTemplateId = data.id;
    });

    // Step 3: GET /api/templates?page=1&limit=100 via BFF
    await t.test('Step 3: GET /api/templates includes newly created template', async () => {
      const req = new Request('http://localhost/api/templates?page=1&limit=100', { method: 'GET' });
      const res = await TemplatesGet(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.data));
      assert.strictEqual(data.data.length, 1);
      assert.strictEqual(data.data[0].id, createdTemplateId);
    });

    // Step 4: GET /api/templates/[templateId] via BFF
    await t.test('Step 4: GET /api/templates/[templateId] returns full detail', async () => {
      const req = new Request(`http://localhost/api/templates/${createdTemplateId}`, { method: 'GET' });
      const res = await TemplateDetailGet(req, { params: Promise.resolve({ templateId: createdTemplateId }) });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.id, createdTemplateId);
      assert.strictEqual(data.name, 'Smoke Gold Wedding');
    });

    // Step 5: PATCH /api/templates/[templateId] via BFF (modify colors & fonts)
    await t.test('Step 5: PATCH /api/templates/[templateId] updates full config', async () => {
      const updatedConfig = {
        version: 1,
        theme: {
          primaryColor: '#881337',
          secondaryColor: '#9f1239',
          backgroundColor: '#fff1f2',
          textColor: '#4c0519',
        },
        typography: {
          headingFont: 'MONTSERRAT',
          bodyFont: 'INTER',
        },
        sections: [
          { id: 'hero', enabled: true, order: 1, variant: 'default' },
          { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
          { id: 'greeting', enabled: false, order: 3, variant: 'default' },
        ],
      };

      const req = new Request(`http://localhost/api/templates/${createdTemplateId}`, {
        method: 'PATCH',
        headers: {
          origin: 'http://localhost:3001',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Romantic Wine Wedding',
          config: updatedConfig,
        }),
      });

      const res = await TemplateDetailPatch(req, { params: Promise.resolve({ templateId: createdTemplateId }) });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.name, 'Romantic Wine Wedding');
      assert.deepStrictEqual(data.config, updatedConfig);
    });
  } finally {
    mock.reset();
  }
});
