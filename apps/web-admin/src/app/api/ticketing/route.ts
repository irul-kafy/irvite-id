import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalApiBaseUrl } from '@/utils/url';
import { isValidAdminOrigin } from '@/utils/origin';

const UPSTREAM_ERROR_MESSAGE =
  'Server API tiket sedang tidak dapat dihubungi (502). Periksa koneksi lalu coba lagi.';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json(
      { message: 'Sesi masuk diperlukan untuk mengakses layanan tiket admin.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'events';
  const category = searchParams.get('category') || undefined;
  const search =
    searchParams.get('q') || searchParams.get('search') || undefined;
  const eventId = searchParams.get('eventId') || undefined;
  const apiBase = getInternalApiBaseUrl();

  const authHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  try {
    let targetUrl: string;

    if (mode === 'summary') {
      targetUrl = `${apiBase}/api/v1/ticketing/summary`;
    } else if (mode === 'inquiries') {
      targetUrl = `${apiBase}/api/v1/ticketing/inquiries`;
    } else if (mode === 'orders' && eventId) {
      targetUrl = `${apiBase}/api/v1/ticketing/events/${encodeURIComponent(eventId)}/orders`;
    } else if (mode === 'offline-snapshot' && eventId) {
      targetUrl = `${apiBase}/api/v1/ticketing/events/${encodeURIComponent(eventId)}/offline-snapshot`;
    } else if (mode === 'checkin-stats' && eventId) {
      targetUrl = `${apiBase}/api/v1/ticketing/events/${encodeURIComponent(eventId)}/checkin-stats`;
    } else if (mode === 'search-tickets' && eventId) {
      const query = new URLSearchParams();
      if (search) query.set('q', search);
      targetUrl = `${apiBase}/api/v1/ticketing/events/${encodeURIComponent(eventId)}/tickets/search?${query.toString()}`;
    } else {
      const query = new URLSearchParams();
      if (category) query.set('category', category);
      if (search) query.set('q', search);
      targetUrl = `${apiBase}/api/v1/ticketing/events${query.size ? `?${query.toString()}` : ''}`;
    }

    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: authHeaders,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (upstream.status === 401) {
      const response = NextResponse.json(
        { message: 'Sesi admin telah berakhir. Silakan masuk kembali.' },
        { status: 401 },
      );
      response.cookies.delete('auth_token');
      return response;
    }

    const json = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const status = upstream.status >= 500 ? 502 : upstream.status;
      return NextResponse.json(
        {
          message:
            json?.message ||
            (status === 502
              ? UPSTREAM_ERROR_MESSAGE
              : 'Gagal memuat data tiket dari server.'),
        },
        { status },
      );
    }

    if (!json) {
      return NextResponse.json(
        { message: UPSTREAM_ERROR_MESSAGE },
        { status: 502 },
      );
    }

    return NextResponse.json(json.data ?? json, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: UPSTREAM_ERROR_MESSAGE },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isValidAdminOrigin(request)) {
    return NextResponse.json(
      { message: 'Asal permintaan tidak diizinkan.' },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json(
      { message: 'Sesi masuk diperlukan untuk melakukan tindakan ini.' },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action as string | undefined;
  const apiBase = getInternalApiBaseUrl();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  try {
    let targetUrl: string;
    let method = 'POST';
    let payload: Record<string, unknown>;

    if (action === 'check-in') {
      targetUrl = `${apiBase}/api/v1/ticketing/check-in`;
      payload = {
        eventId: body.eventId,
        ...(body.qrPayload ? { qrPayload: body.qrPayload } : {}),
        ...(body.qrToken ? { qrToken: body.qrToken } : {}),
        ...(body.qrDigest ? { qrDigest: body.qrDigest } : {}),
        ...(body.ticketCode ? { ticketCode: body.ticketCode } : {}),
        ...(body.gateName ? { gateName: body.gateName } : {}),
      };
    } else if (action === 'undo-check-in') {
      targetUrl = `${apiBase}/api/v1/ticketing/check-in/undo`;
      payload = {
        eventId: body.eventId,
        ...(body.ticketId ? { ticketId: body.ticketId } : {}),
        ...(body.ticketCode ? { ticketCode: body.ticketCode } : {}),
        reason: body.reason,
      };
    } else if (action === 'offline-sync' && body.eventId) {
      targetUrl = `${apiBase}/api/v1/ticketing/events/${encodeURIComponent(String(body.eventId))}/offline-sync`;
      payload = {
        ...(body.deviceId ? { deviceId: body.deviceId } : {}),
        operations: Array.isArray(body.operations) ? body.operations : [],
      };
    } else if (action === 'publish-event' && body.eventId) {
      targetUrl = `${apiBase}/api/v1/ticketing/events/${encodeURIComponent(String(body.eventId))}/publish`;
      payload = {};
    } else if (action === 'update-event' && body.eventId) {
      targetUrl = `${apiBase}/api/v1/ticketing/events/${encodeURIComponent(String(body.eventId))}`;
      method = 'PATCH';
      payload = body;
    } else if (action === 'create-event') {
      targetUrl = `${apiBase}/api/v1/ticketing/events`;
      payload = {
        title: body.title,
        category: body.category,
        organizerName: body.organizerName,
        eventDate: body.eventDate,
        eventTime: body.eventTime,
        venueName: body.venueName,
        city: body.city,
        description: body.description,
        tiers: body.tiers,
      };
    } else {
      return NextResponse.json(
        { message: 'Tindakan layanan tiket tidak dikenali.' },
        { status: 400 },
      );
    }

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (upstream.status === 401) {
      const response = NextResponse.json(
        { message: 'Sesi admin telah berakhir. Silakan masuk kembali.' },
        { status: 401 },
      );
      response.cookies.delete('auth_token');
      return response;
    }

    const json = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const status = upstream.status >= 500 ? 502 : upstream.status;
      return NextResponse.json(
        {
          message:
            json?.message ||
            (status === 502
              ? UPSTREAM_ERROR_MESSAGE
              : 'Gagal memproses tindakan tiket di server.'),
        },
        { status },
      );
    }

    if (!json) {
      return NextResponse.json(
        { message: UPSTREAM_ERROR_MESSAGE },
        { status: 502 },
      );
    }

    return NextResponse.json(json.data ?? json, {
      status: action === 'create-event' ? 201 : 200,
    });
  } catch {
    return NextResponse.json(
      { message: UPSTREAM_ERROR_MESSAGE },
      { status: 502 },
    );
  }
}
