import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

test('catalog search icon has intrinsic and stylesheet size constraints', () => {
  const source = readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  const icon = source.match(/<svg\s+className="catalog-search__icon"[\s\S]*?>/)?.[0];
  assert.ok(icon);
  assert.match(icon, /width="18"/);
  assert.match(icon, /height="18"/);
  const css = readFileSync(path.join(__dirname, 'template-studio.css'), 'utf8');
  const rule = css.match(/\.catalog-search__icon\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(rule, /width:\s*18px/);
  assert.match(rule, /height:\s*18px/);
  assert.match(rule, /pointer-events:\s*none/);
});

test('admin navigation has loading fallbacks and catalog requests have a deadline', () => {
  for (const route of ['templates', 'events', 'dashboard']) {
    const source = readFileSync(path.join(__dirname, '..', route, 'loading.tsx'), 'utf8');
    assert.ok(source.includes('components/page-loading'));
  }
  const catalog = readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
  assert.ok(catalog.includes('AbortSignal.timeout(15000)'));
  assert.ok(catalog.includes('controller.abort()'));
  assert.ok(catalog.includes('if (!res.ok) throw new Error'));
});
