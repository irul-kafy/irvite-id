import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import manifest from '../../../manifest';
import * as offlineStorage from '../../../../utils/offline-scanner-storage';

test('Offline Scanner (PWA) Architecture & Contract Tests', async (t) => {
  await t.test('PWA Web Manifest satisfies installable standalone requirements', () => {
    const config = manifest();
    assert.strictEqual(config.name, 'IRVITE Scanner Check-In');
    assert.strictEqual(config.short_name, 'IRVITE Scan');
    assert.strictEqual(config.display, 'standalone');
    assert.strictEqual(config.start_url, '/events');
    assert.ok(Array.isArray(config.icons) && config.icons.length >= 2);
    assert.ok(config.icons.some((i) => i.sizes === '192x192'));
    assert.ok(config.icons.some((i) => i.sizes === '512x512'));
  });

  await t.test('Service Worker file sw.js exists in public directory', () => {
    const swPath = path.resolve(__dirname, '../../../../../public/sw.js');
    assert.ok(fs.existsSync(swPath), 'public/sw.js must exist for PWA offline caching');
    const content = fs.readFileSync(swPath, 'utf8');
    assert.ok(content.includes('irvite-scanner-v1'), 'sw.js must define cache name');
    assert.ok(content.includes("addEventListener('install'"), 'sw.js must handle install event');
    assert.ok(content.includes("addEventListener('fetch'"), 'sw.js must handle fetch event');
  });

  await t.test('Offline scanner storage module exports all required operations', () => {
    assert.strictEqual(typeof offlineStorage.openScannerDB, 'function');
    assert.strictEqual(typeof offlineStorage.saveOfflineSnapshot, 'function');
    assert.strictEqual(typeof offlineStorage.getOfflineSnapshotMeta, 'function');
    assert.strictEqual(typeof offlineStorage.findGuestByCode, 'function');
    assert.strictEqual(typeof offlineStorage.searchOfflineGuests, 'function');
    assert.strictEqual(typeof offlineStorage.enqueueOfflineOp, 'function');
    assert.strictEqual(typeof offlineStorage.getPendingOps, 'function');
    assert.strictEqual(typeof offlineStorage.clearPendingOps, 'function');
    assert.strictEqual(typeof offlineStorage.updateLocalGuestStatus, 'function');
    assert.strictEqual(typeof offlineStorage.addLocalWalkInGuest, 'function');
  });

  await t.test('BFF API routes for offline snapshot and sync exist', () => {
    const snapshotRoute = path.resolve(
      __dirname,
      '../../../api/events/[eventId]/attendance/offline-snapshot/route.ts'
    );
    const syncRoute = path.resolve(
      __dirname,
      '../../../api/events/[eventId]/attendance/sync/route.ts'
    );

    assert.ok(fs.existsSync(snapshotRoute), 'BFF route offline-snapshot/route.ts must exist');
    assert.ok(fs.existsSync(syncRoute), 'BFF route sync/route.ts must exist');

    const snapContent = fs.readFileSync(snapshotRoute, 'utf8');
    const syncContent = fs.readFileSync(syncRoute, 'utf8');

    assert.ok(snapContent.includes('isValidAdminOrigin'), 'offline-snapshot must validate admin origin');
    assert.ok(syncContent.includes('isValidAdminOrigin'), 'sync route must validate admin origin');
    assert.ok(snapContent.includes('offline-snapshot'), 'offline-snapshot must forward to internal API');
    assert.ok(syncContent.includes('attendance/sync'), 'sync route must forward to internal API');
  });

  await t.test('ScannerClient and scanner.css integrate offline controls and badges', () => {
    const clientPath = path.resolve(__dirname, 'ScannerClient.tsx');
    const cssPath = path.resolve(__dirname, 'scanner.css');

    const clientContent = fs.readFileSync(clientPath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(clientContent.includes('scanner-offline-bar'), 'Must render scanner-offline-bar');
    assert.ok(clientContent.includes('btn-download-offline-data'), 'Must render download offline data button');
    assert.ok(clientContent.includes('downloadOfflineSnapshot'), 'Must have downloadOfflineSnapshot function');
    assert.ok(clientContent.includes('triggerAutoSync'), 'Must have triggerAutoSync function');
    assert.ok(clientContent.includes('enqueueOfflineOp'), 'Must enqueue offline operations');

    assert.ok(cssContent.includes('.scanner-offline-bar'), 'scanner.css must style offline bar');
    assert.ok(cssContent.includes('.scanner-offline-dot--online'), 'scanner.css must style online status');
    assert.ok(cssContent.includes('.scanner-offline-dot--offline'), 'scanner.css must style offline status');
  });
});
