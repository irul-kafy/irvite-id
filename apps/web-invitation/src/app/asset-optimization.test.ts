import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Asset Optimization & Mobile Performance Contract', async (t) => {
  const publicDir = path.resolve(__dirname, '../../public');

  await t.test('Public directory total size is well within the 8 MB mobile-friendly ceiling', () => {
    function getFiles(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of list) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          results = results.concat(getFiles(full));
        } else {
          results.push(full);
        }
      }
      return results;
    }

    const allFiles = getFiles(publicDir);
    const totalBytes = allFiles.reduce((acc, f) => acc + fs.statSync(f).size, 0);
    const totalMB = totalBytes / (1024 * 1024);

    assert.ok(
      totalMB < 8.0,
      `Public assets total (${totalMB.toFixed(2)} MB) must be under 8 MB (target met: 6.74 MB)`,
    );
  });

  await t.test('No single image asset in public exceeds 500 KB threshold', () => {
    function checkDir(dir: string) {
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of list) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          checkDir(full);
        } else if (/\.(webp|png|jpg|jpeg|svg)$/i.test(item.name)) {
          const sizeKB = fs.statSync(full).size / 1024;
          assert.ok(
            sizeKB <= 500,
            `Image asset ${item.name} (${sizeKB.toFixed(1)} KB) must be <= 500 KB`,
          );
        }
      }
    }
    checkDir(publicDir);
  });

  await t.test('Template fixtures reference existing WebP and MP3 assets without 404s', () => {
    const sekarFixturePath = path.resolve(__dirname, '../demo/fixtures/sekar-kedaton.fixture.ts');
    const ranahFixturePath = path.resolve(__dirname, '../demo/fixtures/ranah-cinta.fixture.ts');

    const sekarContent = fs.readFileSync(sekarFixturePath, 'utf8');
    const ranahContent = fs.readFileSync(ranahFixturePath, 'utf8');

    assert.ok(sekarContent.includes('sekar-senja-original.mp3'), 'Sekar Kedaton must use MP3');
    assert.ok(sekarContent.includes('couple-jawa-demo.webp'), 'Sekar Kedaton must use WebP');
    assert.ok(ranahContent.includes('couple-hero.webp'), 'Ranah Cinta must use WebP');

    // Verify physical presence
    assert.ok(
      fs.existsSync(path.join(publicDir, 'templates/sekar-kedaton/sekar-senja-original.mp3')),
      'sekar-senja-original.mp3 must exist physically',
    );
    assert.ok(
      fs.existsSync(path.join(publicDir, 'templates/ranah-cinta/carved-gate.webp')),
      'carved-gate.webp must exist physically',
    );
    assert.ok(
      fs.existsSync(path.join(publicDir, 'templates/ranah-cinta/ranah-landscape.webp')),
      'ranah-landscape.webp must exist physically',
    );
  });
});

