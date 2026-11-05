import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Guest WhatsApp Sent Status Marking Contract', async (t) => {
  const listPage = path.resolve(__dirname, '[eventId]/guests/page.tsx');
  assert.ok(fs.existsSync(listPage), 'guests/page.tsx must exist');

  const content = fs.readFileSync(listPage, 'utf8');

  await t.test('1. Persists WA sent state per event in localStorage', () => {
    assert.ok(
      content.includes('irvite_wa_sent_${eventId}'),
      'Must key WA sent map by eventId in localStorage',
    );
    assert.ok(
      content.includes('markGuestWaSent'),
      'Must define markGuestWaSent helper',
    );
    assert.ok(
      content.includes('toggleGuestWaSent'),
      'Must define toggleGuestWaSent helper for manual toggle/undo',
    );
  });

  await t.test('2. Marks guest as sent when Kirim WA action button is clicked', () => {
    assert.ok(
      content.includes('onClick={() => markGuestWaSent(guest.id)}'),
      'Kirim WA link must invoke markGuestWaSent(guest.id) on click',
    );
    assert.ok(
      content.includes('Kirim Ulang WA'),
      'Action button must transition to Kirim Ulang WA after sending',
    );
  });

  await t.test('3. Displays visual WA sent badge in Undangan column and mobile card', () => {
    assert.ok(
      content.includes('Sudah Dikirim WA'),
      'Desktop table must render Sudah Dikirim WA badge',
    );
    assert.ok(
      content.includes('Belum Dikirim WA'),
      'Desktop table must render Belum Dikirim WA badge when not yet sent',
    );
    assert.ok(
      content.includes('Sudah Dikirim') && content.includes('Belum Dikirim'),
      'Mobile card must display WhatsApp sent status',
    );
  });
});

