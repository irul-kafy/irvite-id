import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiBaseUrl } from '@/api/client';
import { isTicketingEnabled } from '@/config/features';
import {
  checkoutLocalOrder,
  correctLocalOrderEmail,
  findLocalOrderOrTicket,
  findLocalOrdersByEmail,
  formatRupiah,
  listLocalEvents,
  PLATFORM_FEE_PER_TICKET,
  PublicTicketingEvent,
  PublicTicketTier,
} from '@/lib/ticketing-store';

function normalizeUpstreamEvent(raw: Record<string, unknown>): PublicTicketingEvent | null {
  if (!raw || typeof raw !== 'object' || !raw.title) return null;
  const rawCategory = String(raw.category || 'Konser Musik');
  const category: PublicTicketingEvent['category'] =
    rawCategory === 'Seminar' || rawCategory === 'Seminar & Edukasi'
      ? 'Seminar & Edukasi'
      : rawCategory === 'Workshop' || rawCategory === 'Kampus'
        ? 'Workshop'
        : rawCategory === 'Standup Comedy'
          ? 'Standup Comedy'
          : 'Konser Musik';

  const rawTiers = Array.isArray(raw.tiers) ? (raw.tiers as Array<Record<string, unknown>>) : [];
  const tiers: PublicTicketTier[] = rawTiers.map((t, index) => {
    const price = Number(t.price ?? 0);
    const quota = Number(t.quota ?? 100);
    const soldCount = Number(t.soldCount ?? 0);
    const remainingQuota = Number(t.remainingQuota ?? Math.max(0, quota - soldCount));
    const statusLabel: PublicTicketTier['statusLabel'] =
      t.statusLabel === 'HABIS' || t.statusLabel === 'HAMPIR HABIS' || t.statusLabel === 'TERSEDIA'
        ? t.statusLabel
        : remainingQuota <= 0
          ? 'HABIS'
          : remainingQuota <= 15
            ? 'HAMPIR HABIS'
            : 'TERSEDIA';

    return {
      id: String(t.id || `tier-${index + 1}`),
      name: String(t.name || 'Reguler Pass'),
      description: String(t.description || 'Tiket masuk resmi + E-Ticket QR Code instan.'),
      price,
      quota,
      soldCount,
      remainingQuota,
      statusLabel,
      benefits: Array.isArray(t.benefits)
        ? t.benefits.map((b) => String(b))
        : ['E-Ticket QR Code Instan'],
    };
  });

  const startingPrice = Number(
    raw.startingPrice ?? (tiers.length > 0 ? Math.min(...tiers.map((t) => t.price)) : 0),
  );
  const locationRaw = String(raw.venueName || raw.locationDetails || 'Jakarta');
  const [venuePart, cityPart] = locationRaw.split(',').map((s) => s.trim());

  return {
    id: String(raw.id || `evt-${Date.now()}`),
    slug: String(raw.slug || `event-${Date.now()}`),
    title: String(raw.title),
    category,
    organizerName: String(raw.organizerName || raw.organizer || 'IRVITE Official Partner'),
    eventDate: String(raw.eventDateLabel || raw.dateLabel || raw.eventDate || '24 Agu 2026'),
    eventTime: String(raw.eventTime || raw.timeLabel || '19:00 - 22:00 WIB'),
    venueName: venuePart || 'Venue Utama',
    city: String(raw.city || cityPart || 'Jakarta'),
    bannerGradient: String(
      raw.bannerGradient || 'linear-gradient(135deg, #1b3b2b 0%, #0f2419 55%, #2e5a42 100%)',
    ),
    bannerTag: String(raw.bannerTag || raw.bannerTitle || 'OFFICIAL EVENT • E-TICKET INSTAN'),
    startingPrice,
    startingPriceLabel: String(raw.startingPriceLabel || formatRupiah(startingPrice)),
    isFeaturedBanner: Boolean(raw.isFeaturedBanner ?? raw.isFeatured ?? false),
    bannerHeadline: typeof raw.bannerHeadline === 'string' ? raw.bannerHeadline : undefined,
    bannerSubheadline: typeof raw.bannerSubheadline === 'string' ? raw.bannerSubheadline : undefined,
    tiers:
      tiers.length > 0
        ? tiers
        : [
            {
              id: 'tier-default-1',
              name: 'Reguler Pass',
              description: 'Tiket masuk resmi + E-Ticket QR Code instan.',
              price: startingPrice,
              quota: 100,
              soldCount: 20,
              remainingQuota: 80,
              statusLabel: 'TERSEDIA',
              benefits: ['E-Ticket QR Code Instan'],
            },
          ],
  };
}

export async function GET(request: NextRequest) {
  if (!isTicketingEnabled()) {
    return NextResponse.json(
      { message: 'Layanan tiket saat ini tidak aktif di lingkungan ini.' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'events';
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const code = searchParams.get('code') || undefined;
  const email = searchParams.get('email') || undefined;

  const apiBase = getInternalApiBaseUrl();

  if (mode === 'my-tickets' && email) {
    const orders = findLocalOrdersByEmail(email);
    const tickets = orders.flatMap((o) => o.tickets);
    return NextResponse.json({
      email: email.trim().toLowerCase(),
      orders,
      tickets,
      totalOrders: orders.length,
      totalTickets: tickets.length,
    });
  }

  if (mode === 'lookup' && code) {
    const localFound = findLocalOrderOrTicket(code);
    if (localFound) {
      return NextResponse.json(localFound);
    }
    try {
      const upstream = await fetch(`${apiBase}/api/v1/ticketing/orders/${encodeURIComponent(code)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(1800),
      });
      if (upstream.ok) {
        const json = await upstream.json();
        return NextResponse.json(json.data ?? json);
      }
    } catch {
      // Ignore upstream timeout
    }
    return NextResponse.json({ message: `Kode "${code}" tidak ditemukan.` }, { status: 404 });
  }

  // Always include local curated catalog events + any custom upstream events
  const localCatalog = listLocalEvents({ category, search });
  let mergedItems = [...localCatalog.items];

  try {
    const query = new URLSearchParams();
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
      const payload = json.data ?? json;
      const rawList = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.events)
          ? payload.events
          : [];
      const existingSlugs = new Set(mergedItems.map((item) => item.slug));
      for (const raw of rawList) {
        const normalized = normalizeUpstreamEvent(raw);
        if (normalized && !existingSlugs.has(normalized.slug)) {
          if (!category || category === 'Semua' || normalized.category === category) {
            mergedItems.push(normalized);
            existingSlugs.add(normalized.slug);
          }
        }
      }
    }
  } catch {
    // Use local catalog seamlessly when api-server is unreachable
  }

  return NextResponse.json({
    items: mergedItems,
    events: mergedItems,
    total: mergedItems.length,
    totalEvents: mergedItems.length,
    platformFeePerTicket: PLATFORM_FEE_PER_TICKET,
  });
}

export async function POST(request: NextRequest) {
  if (!isTicketingEnabled()) {
    return NextResponse.json(
      { message: 'Layanan tiket saat ini tidak aktif di lingkungan ini.' },
      { status: 404 }
    );
  }

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
            identifier: body.lookupCode || body.identifier,
            lookupCode: body.lookupCode || body.identifier,
            newEmail: body.newEmail,
            correctedBy: body.correctedBy,
          }),
          signal: AbortSignal.timeout(1800),
        });
        if (upstream.ok) {
          const json = await upstream.json();
          const data = json.data ?? json;
          return NextResponse.json({
            ...data,
            orderCode: data.orderCode || body.lookupCode,
            previousEmail: data.previousEmail || data.oldEmail || 'email-sebelumnya',
            updatedEmail: data.updatedEmail || data.newEmail || body.newEmail,
            message:
              data.message ||
              `Alamat email berhasil diperbarui ke ${body.newEmail} dan E-Ticket telah dikirim ulang.`,
          });
        }
      } catch {
        // Fallback to local store
      }
      const result = correctLocalOrderEmail({
        lookupCode: String(body.lookupCode || body.identifier || ''),
        newEmail: String(body.newEmail || ''),
        correctedBy: body.correctedBy ? String(body.correctedBy) : undefined,
      });
      return NextResponse.json(result);
    }

    // Default: checkout
    const result = checkoutLocalOrder({
      eventSlug: String(body.eventSlug || ''),
      tierId: String(body.tierId || ''),
      quantity: Number(body.quantity || 1),
      buyerName: String(body.buyerName || ''),
      buyerEmail: String(body.buyerEmail || ''),
      buyerWhatsapp: String(body.buyerWhatsapp || ''),
      paymentMethod: body.paymentMethod ? String(body.paymentMethod) : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Permintaan gagal diproses.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
