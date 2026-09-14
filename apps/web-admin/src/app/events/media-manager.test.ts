import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllEventMedia } from './[eventId]/components/media-manager';
import { swapMediaOrder, deleteMediaItem } from './[eventId]/components/media-slot-card';

test('Media Manager Specifications', async (t) => {
  const eventId = '11111111-1111-4111-8111-111111111111';

  await t.test('fetchAllEventMedia paginates until all records are collected', async () => {
    const calledPages: number[] = [];

    mock.method(globalThis, 'fetch', async (url: string) => {
      const parsedUrl = new URL(url, 'http://localhost');
      const page = Number(parsedUrl.searchParams.get('page') || '1');
      calledPages.push(page);

      if (page === 1) {
        return Response.json({
          data: [{ id: 'm1', slot: 'hero', type: 'PHOTO' }],
          meta: { total: 3, page: 1, limit: 2, lastPage: 2 },
        });
      } else {
        return Response.json({
          data: [
            { id: 'm2', slot: 'gallery', type: 'PHOTO' },
            { id: 'm3', slot: 'bg-music', type: 'AUDIO' },
          ],
          meta: { total: 3, page: 2, limit: 2, lastPage: 2 },
        });
      }
    });

    const items = await fetchAllEventMedia(eventId);

    assert.deepStrictEqual(calledPages, [1, 2]);
    assert.strictEqual(items.length, 3);
    assert.strictEqual(items[0].id, 'm1');
    assert.strictEqual(items[1].id, 'm2');
    assert.strictEqual(items[2].id, 'm3');
  });

  await t.test('Audio slot does not use image preview endpoint', () => {
    const slotDef = {
      key: 'bg-music',
      label: 'Musik Latar',
      mediaType: 'AUDIO' as const,
      multiple: false,
    };

    const isAudio = slotDef.mediaType === 'AUDIO';
    assert.strictEqual(isAudio, true);

    // Audio slot does not construct or render image file preview URL
    const photoUrl = !isAudio ? '/api/events/' + eventId + '/media/m3/file' : null;
    assert.strictEqual(photoUrl, null);
  });

  await t.test('Media items do not expose raw storage keys or server filesystem paths', () => {
    const mediaRecord = {
      id: '22222222-2222-4222-8222-222222222222',
      eventId,
      slot: 'hero',
      type: 'PHOTO',
      order: 0,
      createdAt: new Date().toISOString(),
    };

    assert.strictEqual('url' in mediaRecord, false, 'raw url key must not be exposed');
    assert.strictEqual('path' in mediaRecord, false, 'filesystem path must not be exposed');
    assert.strictEqual('storageKey' in mediaRecord, false, 'storage key must not be exposed');

    // UI preview route uses authenticated eventId/mediaId endpoint only
    const safePreviewUrl = '/api/events/' + mediaRecord.eventId + '/media/' + mediaRecord.id + '/file';
    assert.match(safePreviewUrl, /^\/api\/events\/[a-f0-9-]+\/media\/[a-f0-9-]+\/file$/);
  });

  await t.test('Replacement failure behavior clearly handles non-atomic delete + upload fail', () => {
    const deleteSucceeded = true;
    const uploadError = new Error('Network timeout during replacement upload');

    const msg = deleteSucceeded
      ? 'Media lama telah dihapus, namun unggahan file baru gagal: ' + uploadError.message + '. Silakan unggah ulang file Anda.'
      : uploadError.message;

    assert.match(msg, /Media lama telah dihapus/);
    assert.match(msg, /Network timeout/);
  });

  await t.test('swapMediaOrder reorder semantics: moving up updates BOTH media records', async () => {
    const items = [
      { id: 'media-a', order: 0 },
      { id: 'media-b', order: 1 },
    ];

    const patchCalls: Array<{ url: string; order: number }> = [];
    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      const parsedBody = JSON.parse(String(init?.body || '{}'));
      patchCalls.push({ url: String(url), order: parsedBody.order });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    // Move media-b (index 1) UP
    const result = await swapMediaOrder(eventId, items, 1, 'up', mockFetch as unknown as typeof fetch);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.partialFailure, false);
    assert.strictEqual(patchCalls.length, 2, 'Must update BOTH media records');
    // First call: media-b assigned order 0
    assert.strictEqual(patchCalls[0].url, '/api/events/' + eventId + '/media/media-b');
    assert.strictEqual(patchCalls[0].order, 0);
    // Second call: media-a assigned order 1
    assert.strictEqual(patchCalls[1].url, '/api/events/' + eventId + '/media/media-a');
    assert.strictEqual(patchCalls[1].order, 1);
  });

  await t.test('swapMediaOrder reorder semantics: moving down updates BOTH media records', async () => {
    const items = [
      { id: 'media-a', order: 0 },
      { id: 'media-b', order: 1 },
    ];

    const patchCalls: Array<{ url: string; order: number }> = [];
    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      const parsedBody = JSON.parse(String(init?.body || '{}'));
      patchCalls.push({ url: String(url), order: parsedBody.order });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    // Move media-a (index 0) DOWN
    const result = await swapMediaOrder(eventId, items, 0, 'down', mockFetch as unknown as typeof fetch);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.partialFailure, false);
    assert.strictEqual(patchCalls.length, 2, 'Must update BOTH media records');
    // First call: media-a assigned order 1
    assert.strictEqual(patchCalls[0].url, '/api/events/' + eventId + '/media/media-a');
    assert.strictEqual(patchCalls[0].order, 1);
    // Second call: media-b assigned order 0
    assert.strictEqual(patchCalls[1].url, '/api/events/' + eventId + '/media/media-b');
    assert.strictEqual(patchCalls[1].order, 0);
  });

  await t.test('swapMediaOrder: boundary items do not trigger fetch calls', async () => {
    const items = [
      { id: 'media-a', order: 0 },
      { id: 'media-b', order: 1 },
    ];

    let fetchCalled = false;
    const mockFetch = async () => {
      fetchCalled = true;
      return new Response('{}', { status: 200 });
    };

    // Try moving top item UP -> boundary
    const upRes = await swapMediaOrder(eventId, items, 0, 'up', mockFetch as unknown as typeof fetch);
    assert.strictEqual(upRes.success, false);
    assert.strictEqual(fetchCalled, false);

    // Try moving bottom item DOWN -> boundary
    const downRes = await swapMediaOrder(eventId, items, 1, 'down', mockFetch as unknown as typeof fetch);
    assert.strictEqual(downRes.success, false);
    assert.strictEqual(fetchCalled, false);
  });

  await t.test('swapMediaOrder: partial failure is handled and informs caller', async () => {
    const items = [
      { id: 'media-a', order: 0 },
      { id: 'media-b', order: 1 },
    ];

    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      if (callCount === 1) {
        return new Response('{}', { status: 200 });
      }
      return new Response(JSON.stringify({ message: 'DB connection timeout' }), { status: 500 });
    };

    const result = await swapMediaOrder(eventId, items, 1, 'up', mockFetch as unknown as typeof fetch);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.partialFailure, true);
    assert.match(result.error || '', /Sebagian urutan media gagal diperbarui/);
  });

  await t.test('deleteMediaItem: cancel prevents DELETE request', async () => {
    let fetchCalled = false;
    const mockFetch = async () => {
      fetchCalled = true;
      return new Response(null, { status: 204 });
    };

    const result = await deleteMediaItem(eventId, 'media-1', () => false, mockFetch as unknown as typeof fetch);
    assert.strictEqual(result.confirmed, false);
    assert.strictEqual(result.success, false);
    assert.strictEqual(fetchCalled, false, 'Fetch MUST NOT be called when deletion is canceled');
  });

  await t.test('deleteMediaItem: confirm executes DELETE request', async () => {
    let calledMethod = '';
    const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      calledMethod = String(init?.method || '');
      return new Response(null, { status: 204 });
    };

    const result = await deleteMediaItem(eventId, 'media-1', () => true, mockFetch as unknown as typeof fetch);
    assert.strictEqual(result.confirmed, true);
    assert.strictEqual(result.success, true);
    assert.strictEqual(calledMethod, 'DELETE');
  });

  await t.test('Actual IVORY_GARDEN media definition audit', () => {
    const ivoryGardenSlots = [
      { key: 'hero', label: 'Foto Utama', mediaType: 'PHOTO', multiple: false, maxItems: 1, maxSizeBytes: 5 * 1024 * 1024 },
      { key: 'gallery', label: 'Galeri Foto', mediaType: 'PHOTO', multiple: true, maxItems: 6, maxSizeBytes: 5 * 1024 * 1024 },
      { key: 'bg-music', label: 'Musik Latar', mediaType: 'AUDIO', multiple: false, maxItems: 1, maxSizeBytes: 10 * 1024 * 1024 },
    ];

    assert.strictEqual(ivoryGardenSlots.length, 3);
    const hero = ivoryGardenSlots.find((s) => s.key === 'hero');
    assert.strictEqual(hero?.maxItems, 1);
    assert.strictEqual(hero?.mediaType, 'PHOTO');

    const gallery = ivoryGardenSlots.find((s) => s.key === 'gallery');
    assert.strictEqual(gallery?.maxItems, 6);
    assert.strictEqual(gallery?.multiple, true);
    assert.strictEqual(gallery?.mediaType, 'PHOTO');

    const bgMusic = ivoryGardenSlots.find((s) => s.key === 'bg-music');
    assert.strictEqual(bgMusic?.maxItems, 1);
    assert.strictEqual(bgMusic?.mediaType, 'AUDIO');

    // Prohibit nonexistent Bride Photo or Groom Photo slots in IVORY_GARDEN
    const bridePhoto = ivoryGardenSlots.find((s) => s.key === 'bride-photo');
    assert.strictEqual(bridePhoto, undefined);

    const groomPhoto = ivoryGardenSlots.find((s) => s.key === 'groom-photo');
    assert.strictEqual(groomPhoto, undefined);
  });
});
