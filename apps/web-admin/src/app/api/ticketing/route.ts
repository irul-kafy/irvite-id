import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiBaseUrl } from '@/utils/url';
import {
  checkInLocalTicket,
  checkoutLocalOrder,
  correctLocalOrderEmail,
  createLocalPublicEvent,
  findLocalOrderOrTicket,
  getLocalTicketingSummary,
  listLocalEvents,
  PublicTicketingEvent,
} from '@/lib/ticketing-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'events';
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const code = searchParams.get('code') || undefined;

  const apiBase = getInternalApiBaseUrl();

  try {
    if (mode === 'summary') {
      const localSummary = getLocalTicketingSummary();
      const upstream = await fetch(`${apiBase}/api/v1/ticketing/summary`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(1800),
      });
      if (upstream.ok) {
        const json = await upstream.json();
        const raw = json.data ?? json;
        return NextResponse.json({
          ...localSummary,
          ...raw,
          totalPublicEvents: Number(raw.totalPublicEvents ?? raw.totalTicketingEvents ?? localSummary.totalPublicEvents),
          totalTicketsSold: Math.max(localSummary.totalTicketsSold, Number(raw.totalTicketsSold ?? 0)),
          grossTicketRevenue: Math.max(localSummary.grossTicketRevenue, Number(raw.grossTicketRevenue ?? 0)),
          grossTicketRevenueLabel:
            raw.grossTicketRevenueLabel || localSummary.grossTicketRevenueLabel,
          platformFeeRevenue: Math.max(
            localSummary.platformFeeRevenue,
            Number(raw.platformFeeRevenue ?? raw.platformServiceFeeRevenue ?? 0),
          ),
          platformFeeRevenueLabel:
            raw.platformFeeRevenueLabel || localSummary.platformFeeRevenueLabel,
        });
      }
      return NextResponse.json(localSummary);
    }

    if (mode === 'lookup' && code) {
      const upstream = await fetch(`${apiBase}/api/v1/ticketing/orders/${encodeURIComponent(code)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(1800),
      });
      if (upstream.ok) {
        const json = await upstream.json();
        return NextResponse.json(json.data ?? json);
      }
      const found = findLocalOrderOrTicket(code);
      if (!found) {
        return NextResponse.json({ message: `Kode "${code}" tidak ditemukan.` }, { status: 404 });
      }
      return NextResponse.json(found);
    }

    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (search) query.set('search', search);
    const upstream = await fetch(
      `${apiBase}/api/v1/ticketing/events${query.toString() ? `?${query.toString()}` : ''}`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(1800),
      },
    );
    if (upstream.ok) {
      const json = await upstream.json();
      return NextResponse.json(json.data ?? json);
    }
  } catch {
    // Fallback to local ticketing store when api-server is offline
  }

  if (mode === 'summary') {
    return NextResponse.json(getLocalTicketingSummary());
  }
  if (mode === 'lookup' && code) {
    const found = findLocalOrderOrTicket(code);
    if (!found) {
      return NextResponse.json({ message: `Kode "${code}" tidak ditemukan.` }, { status: 404 });
    }
    return NextResponse.json(found);
  }

  return NextResponse.json(listLocalEvents({ category, search }));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = body?.action as string | undefined;
  const apiBase = getInternalApiBaseUrl();

  try {
    if (action === 'correct-email') {
      try {
        const upstream = await fetch(`${apiBase}/api/v1/ticketing/cs/correct-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lookupCode: body.lookupCode,
            newEmail: body.newEmail,
            correctedBy: body.correctedBy,
          }),
          signal: AbortSignal.timeout(2000),
        });
        if (upstream.ok) {
          const json = await upstream.json();
          return NextResponse.json(json.data ?? json);
        }
      } catch {
        // Fallback to local store
      }
      const result = correctLocalOrderEmail({
        lookupCode: String(body.lookupCode || ''),
        newEmail: String(body.newEmail || ''),
        correctedBy: body.correctedBy,
      });
      return NextResponse.json(result);
    }

    if (action === 'checkout') {
      try {
        const upstream = await fetch(`${apiBase}/api/v1/ticketing/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(2000),
        });
        if (upstream.ok) {
          const json = await upstream.json();
          return NextResponse.json(json.data ?? json, { status: 201 });
        }
      } catch {
        // Fallback to local store
      }
      const result = checkoutLocalOrder({
        eventSlug: String(body.eventSlug || ''),
        tierId: String(body.tierId || ''),
        quantity: Number(body.quantity) || 1,
        buyerName: String(body.buyerName || ''),
        buyerEmail: String(body.buyerEmail || ''),
        buyerWhatsapp: String(body.buyerWhatsapp || ''),
        paymentMethod: body.paymentMethod,
      });
      return NextResponse.json(result, { status: 201 });
    }

    if (action === 'check-in') {
      try {
        const upstream = await fetch(`${apiBase}/api/v1/ticketing/check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(2000),
        });
        if (upstream.ok) {
          const json = await upstream.json();
          return NextResponse.json(json.data ?? json);
        }
      } catch {
        // Fallback to local store
      }
      const result = checkInLocalTicket({
        ticketCode: String(body.ticketCode || ''),
        gateName: body.gateName,
      });
      return NextResponse.json(result);
    }

    if (action === 'create-event') {
      try {
        const upstream = await fetch(`${apiBase}/api/v1/ticketing/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(2000),
        });
        if (upstream.ok) {
          const json = await upstream.json();
          return NextResponse.json(json.data ?? json, { status: 201 });
        }
      } catch {
        // Fallback to local store
      }
      const created = createLocalPublicEvent({
        title: String(body.title || ''),
        category: (body.category as PublicTicketingEvent['category']) || 'Konser Musik',
        organizerName: String(body.organizerName || 'IRVITE Official Partner'),
        eventDate: String(body.eventDate || '30 Okt 2026'),
        eventTime: String(body.eventTime || '19:00 - 22:30 WIB'),
        venueName: String(body.venueName || 'Jakarta Convention Center'),
        city: String(body.city || 'Jakarta Pusat'),
        tierName: String(body.tierName || 'Reguler Pass'),
        tierPrice: Number(body.tierPrice) || 0,
        tierQuota: Number(body.tierQuota) || 100,
      });
      return NextResponse.json(created, { status: 201 });
    }

    return NextResponse.json({ message: 'Action tidak dikenali.' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada layanan tiket.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
