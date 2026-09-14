'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MediaSlotCard, MediaSlotDefinition, MediaItem } from './media-slot-card';

interface MediaManagerProps {
  eventId: string;
  templateId?: string | null;
}

/**
 * Helper function to safely fetch all paginated media records for an event.
 * Avoids assuming that page 1 contains all records.
 */
export async function fetchAllEventMedia(eventId: string): Promise<MediaItem[]> {
  const allMedia: MediaItem[] = [];
  let page = 1;
  const limit = 20;
  let lastPage = 1;

  while (page <= lastPage) {
    const res = await fetch(`/api/events/${eventId}/media?page=${page}&limit=${limit}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal memuat media acara');
    }
    const body = await res.json();
    const items: MediaItem[] = body.data || [];
    allMedia.push(...items);

    lastPage = body.meta?.lastPage || 1;
    page += 1;
  }

  return allMedia;
}

export function MediaManager({ eventId, templateId }: MediaManagerProps) {
  const [slots, setSlots] = useState<MediaSlotDefinition[]>([]);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load slots from template definition
  const loadDefinition = useCallback(async () => {
    if (!templateId) {
      setSlots([]);
      setUnsupported(false);
      return;
    }

    try {
      const res = await fetch(`/api/templates/${templateId}/definition`);
      if (res.status === 404) {
        setUnsupported(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Gagal memuat konfigurasi slot media');
      }
      const data = await res.json();
      setSlots(data.mediaSlots || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Kesalahan memuat slot media');
    }
  }, [templateId]);

  // Load all media records with pagination
  const loadMedia = useCallback(async () => {
    try {
      const all = await fetchAllEventMedia(eventId);
      setMediaList(all);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Kesalahan memuat daftar media');
    }
  }, [eventId]);


  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        await Promise.all([loadDefinition(), loadMedia()]);
      } catch {
        // Handled in subloaders
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [loadDefinition, loadMedia]);

  if (!templateId) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🖼️</div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Belum Ada Template yang Dipilih
          </h3>
          <p className="text-sm text-muted" style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            Slot media foto dan audio mengikuti spesifikasi template yang dipilih. Silakan pilih template terlebih dahulu pada menu Edit Detail Acara.
          </p>
          <a href={`/events/${eventId}/edit`} className="btn btn-primary btn-sm">
            Pilih Template Sekarang &rarr;
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body flex-center gap-2" style={{ padding: '3rem' }}>
          <span className="spinner" style={{ width: 20, height: 20 }} />
          <span className="text-sm text-muted">Memuat pengelola media template...</span>
        </div>
      </div>
    );
  }

  if (unsupported) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>ℹ️</div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Template Tidak Mendukung Slot Media Terstruktur
          </h3>
          <p className="text-sm text-muted" style={{ maxWidth: '480px', margin: '0 auto' }}>
            Template ini belum memiliki definisi slot media terstruktur.
          </p>
        </div>
      </div>
    );
  }

  // Group media by slot
  const mediaBySlot: Record<string, MediaItem[]> = {};
  for (const m of mediaList) {
    if (!mediaBySlot[m.slot]) {
      mediaBySlot[m.slot] = [];
    }
    mediaBySlot[m.slot].push(m);
  }

  // Sort each slot by order, then createdAt
  for (const slotKey of Object.keys(mediaBySlot)) {
    mediaBySlot[slotKey].sort((a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Pengelola Media Template
          </h2>
          <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Unggah foto dan audio sesuai slot yang disediakan template acara.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadMedia}
        >
          Muat Ulang Media
        </button>
      </div>

      {errorMessage && (
        <div
          className="banner banner--error"
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg, #fef2f2)',
            border: '1px solid var(--danger-border, #fecaca)',
            color: 'var(--danger, #b91c1c)',
            fontSize: '0.875rem',
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

      {slots.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-muted" style={{ padding: '2rem' }}>
            Tidak ada slot media yang didefinisikan untuk template ini.
          </div>
        </div>
      ) : (
        slots.map((slot) => (
          <MediaSlotCard
            key={slot.key}
            eventId={eventId}
            slot={slot}
            items={mediaBySlot[slot.key] || []}
            onMediaChanged={loadMedia}
          />
        ))
      )}
    </div>
  );
}
