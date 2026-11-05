import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalApiBaseUrl } from '../../../utils/url';

export interface AdminNotification {
  id: string;
  category: 'UPCOMING_EVENT' | 'CLIENT_DRAFT' | 'SHEET_SYNC' | 'READINESS';
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
  title: string;
  message: string;
  actionUrl: string;
  tag: string;
  tagColor: 'gold' | 'emerald' | 'amber' | 'rose' | 'blue';
  createdAt: string;
}

export interface EventItemSummary {
  id: string;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  eventDate?: string | null;
  venueName?: string | null;
  locationAddress?: string | null;
  locationDetails?: string | null;
  mapsUrl?: string | null;
  content?: Record<string, unknown> | null;
  googleSheetSync?: {
    connected?: boolean;
    syncStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
    lastSyncedAt?: string | null;
    sheetName?: string | null;
  } | null;
  createdAt?: string | null;
  event?: EventItemSummary | null;
}

export function buildAdminNotifications(events: EventItemSummary[]): AdminNotification[] {
  const notifications: AdminNotification[] = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  for (const event of events) {
    if (!event || event.status === 'ARCHIVED') continue;

    const eventDate = event.eventDate ? new Date(event.eventDate) : null;
    const isDraft = event.status === 'DRAFT' || (typeof event.title === 'string' && /Draf Klien/i.test(event.title));
    const contentObj = (event.content && typeof event.content === 'object' ? event.content : {}) as Record<string, unknown>;
    const contentIntegrations = (contentObj.integrations && typeof contentObj.integrations === 'object' ? contentObj.integrations : {}) as Record<string, unknown>;

    // 1. Draf Klien Baru dari Studio Simulasi
    if (isDraft) {
      const cleanTitle = event.title
        ? event.title.replace(/\(Draf Klien #[^)]+\)/, '').trim() || event.title
        : 'Undangan Baru';
      notifications.push({
        id: `draft-${event.id}`,
        category: 'CLIENT_DRAFT',
        level: 'SUCCESS',
        title: `Draf Klien Masuk: ${cleanTitle}`,
        message: 'Klien telah mengirimkan kustomisasi undangan dari Studio Simulasi. Silakan tinjau dan publish.',
        actionUrl: `/events/${event.id}`,
        tag: 'Draf Klien',
        tagColor: 'gold',
        createdAt: event.createdAt || new Date().toISOString(),
      });
    }

    // 2. Pengingat Jadwal Event Terdekat (Hari-H, H-1, H-3 s/d H-7)
    if (eventDate && !isNaN(eventDate.getTime())) {
      const eventStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime();
      const diffDays = Math.round((eventStart - todayStart) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        notifications.push({
          id: `today-${event.id}`,
          category: 'UPCOMING_EVENT',
          level: 'URGENT',
          title: `Hari Ini: ${event.title || 'Acara'}`,
          message: 'Acara berlangsung HARI INI! Pastikan tim scanner & live attendance monitor siap bertugas.',
          actionUrl: `/events/${event.id}/monitor`,
          tag: 'Hari Ini',
          tagColor: 'rose',
          createdAt: event.eventDate || new Date().toISOString(),
        });
      } else if (diffDays === 1) {
        notifications.push({
          id: `tomorrow-${event.id}`,
          category: 'UPCOMING_EVENT',
          level: 'WARNING',
          title: `Besok: ${event.title || 'Acara'}`,
          message: 'Acara berlangsung BESOK. Cek kelengkapan daftar tamu dan sinkronisasi undangan.',
          actionUrl: `/events/${event.id}`,
          tag: 'H-1',
          tagColor: 'amber',
          createdAt: event.eventDate || new Date().toISOString(),
        });
      } else if (diffDays >= 2 && diffDays <= 7) {
        notifications.push({
          id: `upcoming-${event.id}-${diffDays}`,
          category: 'UPCOMING_EVENT',
          level: 'INFO',
          title: `Pengingat H-${diffDays}: ${event.title || 'Acara'}`,
          message: `Acara dijadwalkan dalam ${diffDays} hari lagi (${eventDate.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
          })}).`,
          actionUrl: `/events/${event.id}`,
          tag: `H-${diffDays}`,
          tagColor: 'blue',
          createdAt: event.eventDate || new Date().toISOString(),
        });
      }

      // 3. Peringatan Kesiapan Venue / Lokasi (Jika H-14 dan belum ada lokasi)
      const hasLocation = Boolean(
        (event.venueName && event.venueName.trim()) ||
        (event.locationAddress && event.locationAddress.trim()) ||
        (event.locationDetails && event.locationDetails.trim()) ||
        (event.mapsUrl && event.mapsUrl.trim()) ||
        (typeof contentObj.venue === 'string' && contentObj.venue.trim()) ||
        (typeof contentObj.venueName === 'string' && contentObj.venueName.trim()) ||
        (typeof contentObj.locationAddress === 'string' && contentObj.locationAddress.trim()) ||
        (typeof contentObj.address === 'string' && contentObj.address.trim()) ||
        (typeof contentObj.mapsUrl === 'string' && contentObj.mapsUrl.trim())
      );

      if (diffDays >= 0 && diffDays <= 14 && !hasLocation) {
        notifications.push({
          id: `readiness-loc-${event.id}`,
          category: 'READINESS',
          level: 'WARNING',
          title: `Lokasi Belum Diisi: ${event.title || 'Acara'}`,
          message: `Acara tinggal ${diffDays === 0 ? 'hari ini' : `${diffDays} hari lagi`} namun data venue dan peta maps belum dilengkapi.`,
          actionUrl: `/events/${event.id}/edit`,
          tag: 'Perlu Dilengkapi',
          tagColor: 'amber',
          createdAt: event.eventDate || new Date().toISOString(),
        });
      }
    }

    // 4. Status Integrasi Google Sheet
    const sheetSync = event.googleSheetSync || (contentIntegrations.googleSheetWebhookUrl ? {
      connected: true,
      syncStatus: 'SUCCESS' as const,
      lastSyncedAt: typeof contentIntegrations.googleSheetUpdatedAt === 'string' ? contentIntegrations.googleSheetUpdatedAt : null,
      sheetName: 'Google Sheets',
    } : null);

    if (sheetSync) {
      if (sheetSync.syncStatus === 'FAILED') {
        notifications.push({
          id: `sheet-failed-${event.id}`,
          category: 'SHEET_SYNC',
          level: 'URGENT',
          title: `Gagal Sync Google Sheet: ${event.title || 'Acara'}`,
          message: 'Sinkronisasi daftar tamu dari Google Sheet gagal. Periksa izin akses spreadsheet.',
          actionUrl: `/events/${event.id}/guests`,
          tag: 'Gagal Sync',
          tagColor: 'rose',
          createdAt: sheetSync.lastSyncedAt || new Date().toISOString(),
        });
      } else if (sheetSync.connected) {
        notifications.push({
          id: `sheet-ok-${event.id}`,
          category: 'SHEET_SYNC',
          level: 'INFO',
          title: `Google Sheet Terhubung: ${event.title || 'Acara'}`,
          message: `Tersambung ke spreadsheet "${sheetSync.sheetName || 'Buku Tamu'}".`,
          actionUrl: `/events/${event.id}/guests`,
          tag: 'Sheet Aktif',
          tagColor: 'emerald',
          createdAt: sheetSync.lastSyncedAt || new Date().toISOString(),
        });
      }
    }
  }

  // Prioritaskan URGENT > WARNING > SUCCESS > INFO
  const priorityOrder: Record<AdminNotification['level'], number> = {
    URGENT: 4,
    WARNING: 3,
    SUCCESS: 2,
    INFO: 1,
  };

  return notifications.sort((a, b) => {
    const pDiff = (priorityOrder[b.level] || 0) - (priorityOrder[a.level] || 0);
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function buildScannerNotifications(scannerEvents: EventItemSummary[]): AdminNotification[] {
  const notifications: AdminNotification[] = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  for (const item of scannerEvents) {
    if (!item) continue;
    const event = item.event || item;
    if (!event || event.status === 'ARCHIVED') continue;

    const eventDate = event.eventDate ? new Date(event.eventDate) : null;
    if (eventDate && !isNaN(eventDate.getTime())) {
      const eventStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime();
      const diffDays = Math.round((eventStart - todayStart) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        notifications.push({
          id: `scanner-today-${event.id}`,
          category: 'UPCOMING_EVENT',
          level: 'URGENT',
          title: `Tugas Hari Ini: ${event.title || 'Acara'}`,
          message: 'Buka scanner QR untuk memvalidasi kedatangan tamu di lokasi acara.',
          actionUrl: `/events/${event.id}/scanner`,
          tag: 'Tugas Hari Ini',
          tagColor: 'rose',
          createdAt: event.eventDate || new Date().toISOString(),
        });
      } else if (diffDays === 1) {
        notifications.push({
          id: `scanner-h1-${event.id}`,
          category: 'UPCOMING_EVENT',
          level: 'INFO',
          title: `Tugas Besok: ${event.title || 'Acara'}`,
          message: 'Persiapkan perangkat dan koneksi untuk penugasan scanner besok.',
          actionUrl: `/events/${event.id}/scanner`,
          tag: 'Tugas Besok',
          tagColor: 'amber',
          createdAt: event.eventDate || new Date().toISOString(),
        });
      }
    }
  }

  return notifications;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const apiBase = getInternalApiBaseUrl();
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  };

  try {
    // Ambil daftar event aktif (hingga 40 event untuk mendeteksi event terdekat & draf)
    let eventsRes = await fetch(`${apiBase}/events?limit=40`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (eventsRes.status === 404) {
      eventsRes = await fetch(`${apiBase}/api/v1/events?limit=40`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
    }

    if (!eventsRes.ok) {
      if (eventsRes.status === 401) {
        const res = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        res.cookies.delete('auth_token');
        return res;
      }

      // Jika role adalah SCANNER atau endpoint event mengembalikan Forbidden (403), ambil dari endpoint scanner
      let scannerRes = await fetch(`${apiBase}/scanner/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }).catch(() => null);

      if (!scannerRes || scannerRes.status === 404) {
        scannerRes = await fetch(`${apiBase}/api/v1/scanner/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        }).catch(() => null);
      }

      if (scannerRes && scannerRes.ok) {
        const scannerData = await scannerRes.json().catch(() => []);
        const notifications = buildScannerNotifications(Array.isArray(scannerData) ? scannerData : []);
        return NextResponse.json({ notifications }, { headers });
      }

      return NextResponse.json({ notifications: [] }, { headers });
    }

    const eventsData = await eventsRes.json().catch(() => null);
    const events: EventItemSummary[] = Array.isArray(eventsData?.data)
      ? eventsData.data
      : Array.isArray(eventsData)
      ? eventsData
      : [];

    const notifications = buildAdminNotifications(events);

    return NextResponse.json({ notifications }, { headers });
  } catch {
    return NextResponse.json({ notifications: [] }, { headers });
  }
}
