import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PublicInvitationResponse } from '../types/public-invitation';

require.extensions['.css'] = (module) => {
  module.exports = { card: 'card', radio: 'radio', choiceText: 'choiceText', submit: 'submit', select: 'select' };
};

let RsvpForm: typeof import('./rsvp-form').RsvpForm;
before(async () => { ({ RsvpForm } = await import('./rsvp-form')); });
function render(response: PublicInvitationResponse['rsvp']['response'], canRespond = true, pax = 1, maxPax = 3) {
  return renderToStaticMarkup(React.createElement(RsvpForm, {
    uniqueCode: 'test-only-not-a-real-invitation', maxPax,
    initialRsvp: { response, canRespond, pax },
  }));
}

describe('Shared RSVP presentation', () => {
  it('renders accessible existing choices and does not create a new RSVP workflow', () => {
    const html = render('PENDING');
    assert.match(html, /aria-label="Form konfirmasi kehadiran"/);
    assert.match(html, /class="card"/);
    assert.equal((html.match(/type="radio"/g) || []).length, 2);
    assert.match(html, /type="submit" disabled=""/);
    assert.doesNotMatch(html, /Berhasil!|<select/);
  });
  it('renders only the existing allowed pax range for an attending guest', () => {
    const html = render('YES', true, 2, 3);
    assert.equal((html.match(/<option /g) || []).length, 3);
    assert.match(html, /<option value="2" selected=""/);
    assert.match(html, /role="status"/);
  });
  it('does not expose pax selection when declined or limited to one person', () => {
    assert.doesNotMatch(render('NO'), /<select/);
    assert.doesNotMatch(render('YES', true, 1, 1), /<select/);
  });
  it('keeps closed RSVP read-only with the persisted response', () => {
    const html = render('YES', false, 2);
    assert.match(html, /RSVP sudah ditutup/);
    assert.match(html, /untuk 2 orang/);
    assert.doesNotMatch(html, /<form|<input|<button/);
  });
  it('ships explicit focus, checked, mobile, and reduced-motion styles without Tailwind', () => {
    const css = readFileSync(path.join(__dirname, 'rsvp-form.module.css'), 'utf8');
    assert.match(css, /\.radio:checked \+ \.choiceText/);
    assert.match(css, /\.radio:focus-visible \+ \.choiceText/);
    assert.match(css, /min-height: 48px/);
    assert.match(css, /max-width: 360px/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(css, /@apply|@tailwind/);
  });
});
