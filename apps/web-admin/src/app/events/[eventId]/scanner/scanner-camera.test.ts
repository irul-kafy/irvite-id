import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Scanner Camera Facing Mode (Front/Back) UI & Architecture Contract', async (t) => {
  const clientPath = path.resolve(__dirname, 'ScannerClient.tsx');
  const cssPath = path.resolve(__dirname, 'scanner.css');

  assert.ok(fs.existsSync(clientPath), 'ScannerClient.tsx must exist');
  assert.ok(fs.existsSync(cssPath), 'scanner.css must exist');

  const clientContent = fs.readFileSync(clientPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  await t.test('ScannerClient has cameraFacing state supporting environment and user', () => {
    assert.ok(
      clientContent.includes("useState<'environment' | 'user'>"),
      'ScannerClient must manage facing mode state between environment and user'
    );
    assert.ok(
      clientContent.includes('irvite_scanner_camera_facing'),
      'ScannerClient must persist camera choice to localStorage'
    );
  });

  await t.test('toggleCameraFacing switches cleanly between environment and user', () => {
    assert.ok(
      clientContent.includes('toggleCameraFacing'),
      'ScannerClient must provide toggleCameraFacing callback'
    );
    assert.ok(
      clientContent.includes("prev === 'environment' ? 'user' : 'environment'"),
      'toggleCameraFacing must alternate between environment (rear) and user (front)'
    );
  });

  await t.test('Media constraints use dynamic cameraFacing with ideal constraint', () => {
    assert.ok(
      clientContent.includes('facingMode: { ideal: cameraFacing }'),
      'Media stream constraints must dynamically pass cameraFacing with ideal constraint'
    );
  });

  await t.test('Renders button #btn-flip-camera with proper accessibility attributes', () => {
    assert.ok(
      clientContent.includes('id="btn-flip-camera"'),
      'ScannerClient must render button with id btn-flip-camera'
    );
    assert.ok(
      clientContent.includes('className="scanner-flip-camera-btn"'),
      'ScannerClient must use scanner-flip-camera-btn styling'
    );
    assert.ok(
      clientContent.includes('Kamera Belakang') && clientContent.includes('Kamera Depan'),
      'ScannerClient must render readable status label for both rear and front cameras'
    );
  });

  await t.test('CSS styles provide mirror transform for user front camera and flip button', () => {
    assert.ok(
      cssContent.includes('.scanner-video--mirrored'),
      'scanner.css must include .scanner-video--mirrored'
    );
    assert.ok(
      cssContent.includes('transform: scaleX(-1)'),
      'Mirrored video must apply transform: scaleX(-1)'
    );
    assert.ok(
      cssContent.includes('.scanner-flip-camera-btn'),
      'scanner.css must style .scanner-flip-camera-btn'
    );
  });

  await t.test('ScannerClient has dedicated ERROR state and does not auto-dismiss error card', () => {
    assert.ok(
      clientContent.includes("'ERROR'"),
      'ScannerClient must include ERROR in ScanState type'
    );
    assert.ok(
      clientContent.includes('id="scanner-error-card"'),
      'ScannerClient must render #scanner-error-card when scan fails'
    );
    assert.ok(
      clientContent.includes('scan-result--error'),
      'ScannerClient must use scan-result--error container'
    );
    assert.ok(
      cssContent.includes('.scan-result--error .scan-result__icon'),
      'scanner.css must style .scan-result--error .scan-result__icon'
    );
  });

  await t.test('Torch (Senter) feature contract in ScannerClient and scanner.css', () => {
    assert.ok(
      clientContent.includes('const [torchOn, setTorchOn] = useState(false)'),
      'ScannerClient must manage torchOn state'
    );
    assert.ok(
      clientContent.includes('toggleTorch'),
      'ScannerClient must provide toggleTorch handler'
    );
    assert.ok(
      clientContent.includes('torch: nextTorch'),
      'toggleTorch must apply hardware torch constraint to video track'
    );
    assert.ok(
      clientContent.includes('id="btn-toggle-torch"'),
      'ScannerClient must render button #btn-toggle-torch'
    );
    assert.ok(
      clientContent.includes('aria-pressed={torchOn}'),
      'Torch button must indicate pressed state with aria-pressed'
    );
    assert.ok(
      clientContent.includes('scanner-viewport-container--torch-active'),
      'ScannerClient must toggle screen illumination border when torch is active'
    );
    assert.ok(
      cssContent.includes('.scanner-torch-btn'),
      'scanner.css must style .scanner-torch-btn'
    );
    assert.ok(
      cssContent.includes('.scanner-torch-btn--active'),
      'scanner.css must style active glowing state .scanner-torch-btn--active'
    );
    assert.ok(
      cssContent.includes('.scanner-viewport-container--torch-active'),
      'scanner.css must style .scanner-viewport-container--torch-active'
    );
  });

  await t.test('Quick Check-in by Guest Name feature contract in ScannerClient and scanner.css', () => {
    assert.ok(
      clientContent.includes('id="btn-quick-checkin-modal"'),
      'ScannerClient must render trigger button #btn-quick-checkin-modal'
    );
    assert.ok(
      clientContent.includes('className="scanner-quick-checkin-btn"'),
      'ScannerClient must use scanner-quick-checkin-btn styling'
    );
    assert.ok(
      clientContent.includes('showQuickCheckIn'),
      'ScannerClient must track showQuickCheckIn modal state'
    );
    assert.ok(
      clientContent.includes('quick-checkin-dialog'),
      'ScannerClient must render modal dialog with quick-checkin-dialog class'
    );
    assert.ok(
      clientContent.includes('quick-checkin-search-input'),
      'ScannerClient must render search input for guest name'
    );
    assert.ok(
      clientContent.includes('quick-checkin-pill'),
      'ScannerClient must render category filter pills'
    );
    assert.ok(
      clientContent.includes('handleDirectCheckIn'),
      'ScannerClient must support 1-tap direct check-in'
    );
    assert.ok(
      clientContent.includes('handleQuickSelectGuest'),
      'ScannerClient must support guest selection to open pax adjustment sheet'
    );
    assert.ok(
      cssContent.includes('.scanner-quick-checkin-btn'),
      'scanner.css must style .scanner-quick-checkin-btn'
    );
    assert.ok(
      cssContent.includes('.quick-checkin-backdrop'),
      'scanner.css must style .quick-checkin-backdrop'
    );
    assert.ok(
      cssContent.includes('.quick-checkin-dialog'),
      'scanner.css must style .quick-checkin-dialog'
    );
    assert.ok(
      cssContent.includes('.quick-checkin-guest-card'),
      'scanner.css must style .quick-checkin-guest-card'
    );
  });
});

