'use client';

import React, { useState, useRef } from 'react';

export interface MediaSlotDefinition {
  key: string;
  label: string;
  mediaType: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'THUMBNAIL';
  required?: boolean;
  multiple?: boolean;
  maxItems?: number;
  maxSizeBytes?: number;
}

export interface MediaItem {
  id: string;
  eventId: string;
  slot: string;
  type: string;
  order: number;
  createdAt: string;
}

interface MediaSlotCardProps {
  eventId: string;
  slot: MediaSlotDefinition;
  items: MediaItem[];
  onMediaChanged: () => void;
  disabled?: boolean;
}

/**
 * Helper to delete a media item with explicit confirmation.
 * Cancel => returns { confirmed: false, success: false }, no DELETE request.
 * Confirm => sends DELETE request.
 */
export async function deleteMediaItem(
  eventId: string,
  mediaId: string,
  confirmFn: () => boolean = () =>
    typeof window !== 'undefined'
      ? window.confirm('Apakah Anda yakin ingin menghapus media ini?')
      : true,
  fetchFn: typeof fetch = fetch
): Promise<{ confirmed: boolean; success: boolean; error?: string }> {
  if (!confirmFn()) {
    return { confirmed: false, success: false };
  }

  const res = await fetchFn(`/api/events/${eventId}/media/${mediaId}`, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Gagal menghapus file media');
  }

  return { confirmed: true, success: true };
}

/**
 * Helper to swap order of two adjacent media items in gallery.
 * Both items receive PATCH requests exchanging their order numbers.
 * Because operation is multiple requests and non-atomic:
 * - handles partial failure explicitly
 * - informs caller to refresh state
 */
export async function swapMediaOrder(
  eventId: string,
  items: Array<{ id: string; order: number }>,
  currentIndex: number,
  direction: 'up' | 'down',
  fetchFn: typeof fetch = fetch
): Promise<{ success: boolean; partialFailure: boolean; error?: string }> {
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return { success: false, partialFailure: false, error: 'Batas urutan telah tercapai.' };
  }

  const currentItem = items[currentIndex];
  const neighborItem = items[targetIndex];

  // Calculate exchanged order numbers
  const targetCurrentOrder =
    neighborItem.order !== currentItem.order ? neighborItem.order : targetIndex;
  const targetNeighborOrder =
    neighborItem.order !== currentItem.order ? currentItem.order : currentIndex;

  // Step 1: Update current item
  const res1 = await fetchFn(`/api/events/${eventId}/media/${currentItem.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: targetCurrentOrder }),
  });

  if (!res1.ok) {
    const errData = await res1.json().catch(() => ({}));
    return {
      success: false,
      partialFailure: false,
      error: errData.message || 'Gagal mengubah urutan media.',
    };
  }

  // Step 2: Update neighbor item
  const res2 = await fetchFn(`/api/events/${eventId}/media/${neighborItem.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: targetNeighborOrder }),
  });

  if (!res2.ok) {
    const errData = await res2.json().catch(() => ({}));
    const detail = errData.message ? ' (' + errData.message + ')' : '';
    return {
      success: false,
      partialFailure: true,
      error:
        'Sebagian urutan media gagal diperbarui' + detail + '. Memuat ulang data dari server...',
    };
  }

  return { success: true, partialFailure: false };
}

export function MediaSlotCard({
  eventId,
  slot,
  items = [],
  onMediaChanged,
  disabled = false,
}: MediaSlotCardProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [itemToReplace, setItemToReplace] = useState<MediaItem | null>(null);

  const isAudio = slot.mediaType === 'AUDIO';
  const isMultiple = Boolean(slot.multiple);
  const maxItems = slot.maxItems || (isMultiple ? 10 : 1);
  const maxMb = slot.maxSizeBytes ? Math.round(slot.maxSizeBytes / (1024 * 1024)) : (isAudio ? 10 : 5);

  const canUpload = items.length < maxItems && !disabled && !uploading;

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setActionError(null);
    setActionSuccess(null);

    // Client-side size check
    if (slot.maxSizeBytes && file.size > slot.maxSizeBytes) {
      setActionError(`Ukuran file melebihi batas maksimal ${maxMb} MiB.`);
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', slot.mediaType);
      formData.append('slot', slot.key);
      formData.append('order', String(items.length));

      const res = await fetch(`/api/events/${eventId}/media`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengunggah file media');
      }

      setActionSuccess(`${slot.label} berhasil diunggah.`);
      onMediaChanged();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunggah'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (disabled) return;
    setDeletingId(mediaId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await deleteMediaItem(eventId, mediaId);
      if (!result.confirmed) {
        setDeletingId(null);
        return;
      }
      setActionSuccess('Media berhasil dihapus.');
      onMediaChanged();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus media'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleReplaceFile = async (oldMedia: MediaItem, newFile: File) => {
    setUploading(true);
    setActionError(null);
    setActionSuccess(null);

    // Client-side size check
    if (slot.maxSizeBytes && newFile.size > slot.maxSizeBytes) {
      setActionError(`Ukuran file baru melebihi batas maksimal ${maxMb} MiB.`);
      setUploading(false);
      return;
    }

    // Step 1: Delete old media
    let deleteSucceeded = false;
    try {
      const delRes = await fetch(`/api/events/${eventId}/media/${oldMedia.id}`, {
        method: 'DELETE',
      });
      if (delRes.ok || delRes.status === 204) {
        deleteSucceeded = true;
      } else {
        const delData = await delRes.json().catch(() => ({}));
        throw new Error(delData.message || 'Gagal menghapus media lama saat proses penggantian.');
      }
    } catch (delErr: unknown) {
      setActionError(
        delErr instanceof Error ? delErr.message : 'Gagal menghapus media lama.'
      );
      setUploading(false);
      setItemToReplace(null);
      return;
    }

    // Step 2: Upload new media
    try {
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('type', slot.mediaType);
      formData.append('slot', slot.key);
      formData.append('order', '0');

      const uploadRes = await fetch(`/api/events/${eventId}/media`, {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(
          uploadData.message ||
            'Media lama telah terhapus, namun unggahan file baru gagal. Silakan unggah ulang file Anda.'
        );
      }

      setActionSuccess(`${slot.label} berhasil diperbarui.`);
      onMediaChanged();
    } catch (uploadErr: unknown) {
      // Backend is not atomic: clearly inform the operator
      const msg = deleteSucceeded
        ? `Media lama telah dihapus, namun unggahan file baru gagal: ${
            uploadErr instanceof Error ? uploadErr.message : 'Kesalahan jaringan'
          }. Silakan unggah ulang file Anda.`
        : uploadErr instanceof Error
        ? uploadErr.message
        : 'Gagal mengunggah media pengganti.';
      setActionError(msg);
      onMediaChanged(); // Refresh to reflect deletion of old media
    } finally {
      setUploading(false);
      setItemToReplace(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleReorder = async (mediaId: string, currentOrder: number, direction: 'up' | 'down') => {
    if (disabled || reorderingId) return;
    const currentIndex = items.findIndex((i) => i.id === mediaId);
    if (currentIndex === -1) return;

    setReorderingId(mediaId);
    setActionError(null);

    try {
      const result = await swapMediaOrder(eventId, items, currentIndex, direction);
      if (!result.success) {
        setActionError(result.error || 'Gagal mengubah urutan');
      }
      // Always refresh to reflect true server state (crucial for partial failure)
      onMediaChanged();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Gagal mengubah urutan');
      onMediaChanged();
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <div className="card mb-4" style={{ border: '1px solid var(--admin-border)' }}>
      <div className="card-header flex-between">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {slot.label}
            </h3>
            <span className="badge badge--info text-xs font-mono">{slot.key}</span>
          </div>
          <p className="text-xs text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Tipe: {slot.mediaType} &bull; Batas: {maxMb} MiB {isMultiple ? `&bull; Maks: ${maxItems} item` : ''}
          </p>
        </div>

        {isMultiple && (
          <span className="badge badge--primary">
            {items.length} / {maxItems} File
          </span>
        )}
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {actionSuccess && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--success-bg, #ecfdf5)',
              border: '1px solid var(--success-border, #a7f3d0)',
              color: 'var(--success-text, #065f46)',
              fontSize: '0.8125rem',
            }}
          >
            ✓ {actionSuccess}
          </div>
        )}

        {actionError && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg, #fef2f2)',
              border: '1px solid var(--danger-border, #fecaca)',
              color: 'var(--danger, #b91c1c)',
              fontSize: '0.8125rem',
            }}
          >
            ⚠️ {actionError}
          </div>
        )}

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept={isAudio ? 'audio/*' : 'image/jpeg,image/png,image/webp'}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUploadFile(f);
          }}
        />

        <input
          type="file"
          ref={replaceInputRef}
          style={{ display: 'none' }}
          accept={isAudio ? 'audio/*' : 'image/jpeg,image/png,image/webp'}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && itemToReplace) handleReplaceFile(itemToReplace, f);
          }}
        />

        {/* SINGLE SLOT RENDERING */}
        {!isMultiple && (
          <div>
            {items.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--admin-bg)',
                  border: '1px dashed var(--admin-border)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                  {isAudio ? '🎵' : '🖼️'}
                </div>
                <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
                  Belum ada {slot.label.toLowerCase()} yang diunggah.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!canUpload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? 'Mengunggah...' : `Unggah ${slot.label}`}
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--admin-bg)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {/* PHOTO PREVIEW (Authenticated BFF route) */}
                {!isAudio ? (
                  <div
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: '1px solid var(--admin-border)',
                      background: '#000',
                      flexShrink: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
<img
                      src={`/api/events/${eventId}/media/${items[0].id}/file`}
                      alt={slot.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  /* AUDIO SAFE METADATA ONLY (DO NOT use image preview endpoint) */
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--admin-accent-soft, #fef3c7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.75rem',
                      flexShrink: 0,
                    }}
                  >
                    🎵
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    {isAudio ? 'Audio Musik Latar Terunggah' : slot.label}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Slot: {items[0].slot} &bull; Tipe: {items[0].type}
                  </div>
                  <div className="text-xs text-muted">
                    Dibuat: {new Date(items[0].createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={uploading || disabled}
                      onClick={() => {
                        setItemToReplace(items[0]);
                        replaceInputRef.current?.click();
                      }}
                    >
                      {uploading ? 'Memproses...' : 'Ganti File'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      disabled={deletingId === items[0].id || disabled}
                      onClick={() => handleDeleteMedia(items[0].id)}
                    >
                      {deletingId === items[0].id ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MULTIPLE SLOT (GALLERY) RENDERING */}
        {isMultiple && (
          <div>
            {items.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--admin-bg)',
                  border: '1px dashed var(--admin-border)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
                <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
                  Belum ada foto galeri yang diunggah.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!canUpload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? 'Mengunggah...' : '+ Unggah Foto Galeri'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--admin-border)',
                        overflow: 'hidden',
                        background: 'var(--admin-bg)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ height: '140px', background: '#000', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
<img
                          src={`/api/events/${eventId}/media/${item.id}/file`}
                          alt={`Foto galeri ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div className="flex-between mb-2">
                          <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                            Urutan #{idx + 1}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)', padding: '0.15rem 0.35rem', fontSize: '0.75rem' }}
                            disabled={deletingId === item.id || disabled}
                            onClick={() => handleDeleteMedia(item.id)}
                            aria-label={`Hapus foto ${idx + 1}`}
                          >
                            {deletingId === item.id ? '...' : 'Hapus'}
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, padding: '0.2rem', fontSize: '0.75rem' }}
                            disabled={idx === 0 || disabled || reorderingId === item.id}
                            onClick={() => handleReorder(item.id, idx, 'up')}
                            aria-label="Geser ke kiri"
                          >
                            &larr; Naik
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, padding: '0.2rem', fontSize: '0.75rem' }}
                            disabled={idx === items.length - 1 || disabled || reorderingId === item.id}
                            onClick={() => handleReorder(item.id, idx, 'down')}
                            aria-label="Geser ke kanan"
                          >
                            Turun &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {items.length < maxItems && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm flex-center gap-1"
                      disabled={!canUpload}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? 'Mengunggah...' : `+ Tambah Foto Galeri (${items.length}/${maxItems})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
