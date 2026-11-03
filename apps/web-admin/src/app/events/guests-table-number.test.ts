import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Guest Optional Table Number ("Meja") Architecture Contract', async (t) => {
  const createPage = path.resolve(__dirname, '[eventId]/guests/create/page.tsx');
  const editPage = path.resolve(__dirname, '[eventId]/guests/[guestId]/edit/page.tsx');
  const listPage = path.resolve(__dirname, '[eventId]/guests/page.tsx');
  const scannerClient = path.resolve(__dirname, '[eventId]/scanner/ScannerClient.tsx');
  const qrDisplay = path.resolve(__dirname, '../../../../web-invitation/src/components/QRDisplay.tsx');

  assert.ok(fs.existsSync(createPage), 'create/page.tsx must exist');
  assert.ok(fs.existsSync(editPage), 'edit/page.tsx must exist');
  assert.ok(fs.existsSync(listPage), 'guests/page.tsx must exist');
  assert.ok(fs.existsSync(scannerClient), 'ScannerClient.tsx must exist');
  assert.ok(fs.existsSync(qrDisplay), 'QRDisplay.tsx must exist');

  const createContent = fs.readFileSync(createPage, 'utf8');
  const editContent = fs.readFileSync(editPage, 'utf8');
  const listContent = fs.readFileSync(listPage, 'utf8');
  const scannerContent = fs.readFileSync(scannerClient, 'utf8');
  const qrContent = fs.readFileSync(qrDisplay, 'utf8');

  await t.test('1. Guest Create page has optional "Nomor Meja" input', () => {
    assert.ok(createContent.includes('id="guest-table-number"'), 'create page must have guest-table-number input');
    assert.ok(createContent.includes('tableNumber:'), 'create page must send tableNumber in payload');
    assert.ok(createContent.includes('Nomor Meja'), 'create page must label the field Nomor Meja');
  });

  await t.test('2. Guest Edit page has optional "Nomor Meja" input with value binding', () => {
    assert.ok(editContent.includes('id="guest-table-number"'), 'edit page must have guest-table-number input');
    assert.ok(editContent.includes('tableNumber:'), 'edit page must send tableNumber in payload');
    assert.ok(editContent.includes('Nomor Meja'), 'edit page must label the field Nomor Meja');
  });

  await t.test('3. Guest List table and mobile cards display "Meja" badge if present', () => {
    assert.ok(listContent.includes('guest.tableNumber'), 'list page must check guest.tableNumber');
    assert.ok(listContent.includes('Meja:'), 'list page must display Meja badge when present');
  });

  await t.test('4. ScannerClient highlights Meja in resolving sheet and success check-in card', () => {
    assert.ok(scannerContent.includes('guest.tableNumber'), 'ScannerClient must read guest.tableNumber');
    assert.ok(
      scannerContent.includes('Silakan Arahkan ke:') && scannerContent.includes('guest.tableNumber'),
      'ScannerClient must guide usher to table upon check-in'
    );
  });

  await t.test('5. QRDisplay renders table badge on guest ticket when tableNumber is provided', () => {
    assert.ok(qrContent.includes('tableNumber?: string | null'), 'QRDisplay must accept optional tableNumber prop');
    assert.ok(qrContent.includes('qr-table-badge'), 'QRDisplay must style table badge cleanly');
  });
});
