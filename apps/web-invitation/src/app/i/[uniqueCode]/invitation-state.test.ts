import { before, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

require.extensions['.css'] = (module) => { module.exports = { surface: 'surface', card: 'card' }; };
let Loading: typeof import('./loading').default;
let NotFound: typeof import('./not-found').default;
let ErrorPage: typeof import('./error').default;
before(async () => {
  Loading = (await import('./loading')).default;
  NotFound = (await import('./not-found')).default;
  ErrorPage = (await import('./error')).default;
});

it('loading has a styled live status without relying on absent Tailwind utilities', () => {
  const html = renderToStaticMarkup(React.createElement(Loading));
  assert.match(html, /class="surface" role="status" aria-busy="true"/);
  assert.match(html, /Memuat undangan/);
});
it('missing invitations show a neutral message without guest identity or QR', () => {
  const html = renderToStaticMarkup(React.createElement(NotFound));
  assert.match(html, /Undangan tidak tersedia/);
  assert.match(html, /tautan dari pengirim/);
  assert.doesNotMatch(html, /<form|<svg|<input/);
});
it('error boundary exposes the current Next retry action, not internal error details', () => {
  const html = renderToStaticMarkup(React.createElement(ErrorPage, { retry: () => undefined }));
  assert.match(html, /role="alert"/);
  assert.match(html, /<button type="button"[^>]*>Coba lagi<\/button>/);
  const source = readFileSync(path.join(__dirname, 'error.tsx'), 'utf8');
  assert.match(source, /onClick=\{\(\) => retry\(\)\}/);
  assert.doesNotMatch(source, /error\.message|error\.stack/);
});
it('fallback styles retain keyboard focus and reduced-motion support', () => {
  const css = readFileSync(path.join(__dirname, 'invitation-state.module.css'), 'utf8');
  assert.match(css, /\.retry:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /min-height: 100svh/);
});
