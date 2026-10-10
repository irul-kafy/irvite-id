import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePackageManifest, readTemplatePackage, TEMPLATE_PACKAGE_EXAMPLE } from './template-package';
import JSZip from 'jszip';

test('template package manifest parser', async (t) => {
  await t.test('accepts the downloadable schema example', () => {
    const parsed = parsePackageManifest(JSON.stringify(TEMPLATE_PACKAGE_EXAMPLE));
    assert.equal(parsed.schemaVersion, 1);
    assert.equal(parsed.renderer, 'GENERIC');
    assert.equal(parsed.config.sections.length, 9);
  });

  await t.test('rejects executable renderers and unsafe asset paths', () => {
    assert.throws(() => parsePackageManifest(JSON.stringify({
      ...TEMPLATE_PACKAGE_EXAMPLE,
      renderer: 'CUSTOM_JS',
    })), /GENERIC/);
    assert.throws(() => parsePackageManifest(JSON.stringify({
      ...TEMPLATE_PACKAGE_EXAMPLE,
      assets: { background: '../secret.png' },
    })), /tidak aman/);
  });

  await t.test('rejects malformed configs without throwing implementation errors', () => {
    assert.throws(() => parsePackageManifest(JSON.stringify({
      ...TEMPLATE_PACKAGE_EXAMPLE,
      config: null,
    })), /Struktur config/);
  });
});

test('ZIP imports extract only declared files with bounded output', async () => {
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({ ...TEMPLATE_PACKAGE_EXAMPLE, assets: { background: 'assets/garden.png' } }));
  zip.file('assets/garden.png', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const result = await readTemplatePackage(new File([new Uint8Array(bytes)], 'garden.zip'));
  assert.equal(result.assets[0].blob.type, 'image/png');
  assert.equal(result.assets[0].slot, 'background');
  zip.file('script.js', 'alert(1)');
  const undeclared = await zip.generateAsync({ type: 'uint8array' });
  await assert.rejects(readTemplatePackage(new File([new Uint8Array(undeclared)], 'bad.zip')), /tidak dideklarasikan/);
});

test('rejects compressed assets that exceed the image output limit', async () => {
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({ ...TEMPLATE_PACKAGE_EXAMPLE, assets: { background: 'large.png' } }));
  zip.file('large.png', new Uint8Array(6 * 1024 * 1024));
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  assert.ok(bytes.length < 100000);
  await assert.rejects(readTemplatePackage(new File([new Uint8Array(bytes)], 'compressed.zip')), /melebihi batas ukuran/);
});
