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
});
