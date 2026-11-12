import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('QR Ticket Offline E-Pass Download Contract Tests', async (t) => {
  const qrDisplayPath = path.resolve(__dirname, 'QRDisplay.tsx');
  const qrCssPath = path.resolve(__dirname, 'qr.css');

  assert.ok(fs.existsSync(qrDisplayPath), 'QRDisplay.tsx must exist');
  assert.ok(fs.existsSync(qrCssPath), 'qr.css must exist');

  const qrDisplayContent = fs.readFileSync(qrDisplayPath, 'utf8');
  const qrCssContent = fs.readFileSync(qrCssPath, 'utf8');

  await t.test('1. QRDisplay accepts eventTitle prop and supports all theme variants', () => {
    assert.ok(
      qrDisplayContent.includes('eventTitle?: string'),
      'QRDisplay must accept optional eventTitle prop'
    );
    assert.ok(
      qrDisplayContent.includes('tableNumber?: string | null'),
      'QRDisplay must accept tableNumber prop'
    );
  });

  await t.test('2. QRDisplay renders 1-click download button with accessibility attributes', () => {
    assert.ok(
      qrDisplayContent.includes('id="btn-download-qr-ticket"'),
      'QRDisplay must render #btn-download-qr-ticket button'
    );
    assert.ok(
      qrDisplayContent.includes('className={`qr-download-btn'),
      'QRDisplay must use qr-download-btn CSS class'
    );
    assert.ok(
      qrDisplayContent.includes('Download Tiket QR'),
      'QRDisplay must present clear Indonesian action text for downloading ticket'
    );
    assert.ok(
      qrDisplayContent.includes('qr-offline-tip'),
      'QRDisplay must render offline tip'
    );
  });

  await t.test('3. QRDisplay embeds hidden QRCodeCanvas for sharp canvas rendering', () => {
    assert.ok(
      qrDisplayContent.includes('QRCodeCanvas'),
      'QRDisplay must import and use QRCodeCanvas for bitmap drawing'
    );
    assert.ok(
      qrDisplayContent.includes('canvasQrRef'),
      'QRDisplay must maintain a ref to the QR canvas source'
    );
  });

  await t.test('4. Ticket generation produces high-resolution card with direct file download', () => {
    assert.ok(
      qrDisplayContent.includes('width = 900') && qrDisplayContent.includes('height = 1350'),
      'Generated card must be high-resolution (900x1350 px) for crisp mobile display'
    );
    assert.ok(
      qrDisplayContent.includes('IRVITE') && qrDisplayContent.includes('DIGITAL GUEST PASS'),
      'Generated card must include official IRVITE digital guest pass branding'
    );
    assert.ok(
      qrDisplayContent.includes('link.download = fileName'),
      'Generated card must trigger direct file download'
    );
    assert.ok(
      qrDisplayContent.includes('URL.revokeObjectURL'),
      'Generated card download must clean up object URLs to prevent memory leaks'
    );
  });

  await t.test('5. CSS styles provide luxury styling, spinner, and success state', () => {
    assert.ok(
      qrCssContent.includes('.qr-download-btn'),
      'qr.css must define .qr-download-btn'
    );
    assert.ok(
      qrCssContent.includes('.qr-download-btn--success'),
      'qr.css must define .qr-download-btn--success'
    );
    assert.ok(
      qrCssContent.includes('.qr-download-spinner'),
      'qr.css must define .qr-download-spinner'
    );
    assert.ok(
      qrCssContent.includes('.qr-offline-tip'),
      'qr.css must define .qr-offline-tip'
    );
  });

  await t.test('6. All wedding invitation renderers pass eventTitle to QRDisplay', () => {
    const renderersDir = path.resolve(__dirname, '../renderers');
    const themes = [
      'aetheria/aetheria.tsx',
      'opaline-nocturne/opaline-nocturne.tsx',
      'ranah-cinta/ranah-cinta.tsx',
      'royal-velvet/royal-velvet.tsx',
      'sekar-kedaton/sekar-kedaton.tsx',
      'swarga-dewata/swarga-dewata.tsx',
      'themes/generic.tsx',
    ];

    for (const themeFile of themes) {
      const filePath = path.join(renderersDir, themeFile);
      assert.ok(fs.existsSync(filePath), `${themeFile} must exist`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('eventTitle='),
        `${themeFile} must pass eventTitle to QRDisplay`
      );
    }
  });
});

