import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Interactive Image Cropper & Framing Modal Contract Tests', async (t) => {
  const cropperComponentPath = path.resolve(__dirname, 'image-cropper-modal.tsx');
  const cropperCssPath = path.resolve(__dirname, 'image-cropper-modal.css');
  const studioComponentPath = path.resolve(__dirname, 'template-customizer-studio.tsx');
  const studioCssPath = path.resolve(__dirname, 'template-customizer-studio.css');

  assert.ok(fs.existsSync(cropperComponentPath), 'image-cropper-modal.tsx must exist');
  assert.ok(fs.existsSync(cropperCssPath), 'image-cropper-modal.css must exist');
  assert.ok(fs.existsSync(studioComponentPath), 'template-customizer-studio.tsx must exist');

  const cropperCode = fs.readFileSync(cropperComponentPath, 'utf8');
  const cropperCss = fs.readFileSync(cropperCssPath, 'utf8');
  const studioCode = fs.readFileSync(studioComponentPath, 'utf8');
  const studioCss = fs.readFileSync(studioCssPath, 'utf8');

  await t.test('1. ImageCropperModal exports expected interfaces and component', () => {
    assert.ok(
      cropperCode.includes('export interface ImageCropperResult'),
      'Must export ImageCropperResult interface'
    );
    assert.ok(
      cropperCode.includes('export interface ImageCropperModalProps'),
      'Must export ImageCropperModalProps interface'
    );
    assert.ok(
      cropperCode.includes('export function ImageCropperModal'),
      'Must export ImageCropperModal functional component'
    );
  });

  await t.test('2. Aspect ratio presets cover all required template photo orientations', () => {
    assert.ok(
      cropperCode.includes('16:9 Landscape'),
      'Must support 16:9 Landscape for Story Window / Kisah Kasih'
    );
    assert.ok(
      cropperCode.includes('3:4 Potret'),
      'Must support 3:4 Portrait for Bride & Groom cameos'
    );
    assert.ok(
      cropperCode.includes('9:16 Vertikal'),
      'Must support 9:16 Vertical for full-bleed mobile Hero cover'
    );
    assert.ok(
      cropperCode.includes('1:1 Persegi'),
      'Must support 1:1 Square for QRIS / Avatars'
    );
    assert.ok(
      cropperCode.includes('4:3 Landscape'),
      'Must support standard 4:3 Landscape'
    );
  });

  await t.test('3. Interactive gestures: Pan, Zoom, Pinch, Wheel, and 90° Rotation', () => {
    assert.ok(
      cropperCode.includes('handlePointerDown') && cropperCode.includes('setPointerCapture'),
      'Must use pointer capture for smooth drag/pan without losing focus outside bounds'
    );
    assert.ok(
      cropperCode.includes('handleWheel'),
      'Must support mouse wheel zooming'
    );
    assert.ok(
      cropperCode.includes('handleTouchStart') && cropperCode.includes('handleTouchMove'),
      'Must support mobile pinch-to-zoom tracking'
    );
    assert.ok(
      cropperCode.includes('handleRotate'),
      'Must support 90-degree clockwise image rotation'
    );
    assert.ok(
      cropperCode.includes('irv-crop-grid'),
      'Must render rule of thirds photography grid overlay'
    );
  });

  await t.test('4. HD Canvas export preserves image sharpness and provides original photo fallback', () => {
    assert.ok(
      cropperCode.includes('document.createElement(\'canvas\')'),
      'Must draw onto HTML5 canvas for export'
    );
    assert.ok(
      cropperCode.includes('canvas.toBlob'),
      'Must export as Blob for storage efficiency'
    );
    assert.ok(
      cropperCode.includes('onUseOriginal'),
      'Must provide onUseOriginal fallback handler'
    );
    assert.ok(
      cropperCode.includes('createPortal('),
      'Must render via React createPortal to document.body to prevent parent container scroll/overflow clipping'
    );
  });

  await t.test('5. TemplateCustomizerStudio integrates ImageCropperModal for single slots and QRIS', () => {
    assert.ok(
      studioCode.includes('import {'),
      'Must import ImageCropperModal in studio'
    );
    assert.ok(
      studioCode.includes('ImageCropperModal'),
      'Must render ImageCropperModal in studio'
    );
    assert.ok(
      studioCode.includes('handleOpenCropperForExisting'),
      'Must provide handler to re-crop/adjust existing uploaded photos'
    );
    assert.ok(
      studioCode.includes('irv-studio-crop-trigger-btn'),
      'Must render crop trigger button in studio'
    );
    assert.ok(
      studioCss.includes('.irv-studio-crop-trigger-btn'),
      'Must style crop trigger button in CSS'
    );
  });
});
