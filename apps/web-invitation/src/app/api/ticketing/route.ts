import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiBaseUrl } from '@/api/client';
import { isTicketingEnabled } from '@/config/features';

const UPSTREAM_ERROR_MESSAGE =
  'Layanan server tiket sedang tidak dapat dihubungi (502). Silakan coba lagi.';

export async function GET(request: NextRequest) {
  if (!isTicketingEnabled()) {
    return NextResponse.json(
      { message: 'Layanan tiket saat ini tidak aktif di lingkungan ini.' },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || undefined;
  const orderCode = searchParams.get('orderCode') || undefined;
  const accessToken = searchParams.get('accessToken') || undefined;
  const apiBase = getInternalApiBaseUrl();

  try {
    let targetUrl: string;

    if (orderCode) {
      const tokenQuery = accessToken
        ? `?accessToken=${encodeURIComponent(accessToken)}`
        : '';
      targetUrl = `${apiBase}/api/v1/ticketing/orders/${encodeURIComponent(orderCode)}${tokenQuery}`;
    } else if (slug) {
      targetUrl = `${apiBase}/api/v1/ticketing/events/${encodeURIComponent(slug)}`;
    } else {
      const query = new URLSearchParams();
      for (const [key, value] of searchParams.entries()) {
        if (value && value !== 'Semua') {
          query.set(key === 'search' ? 'q' : key, value);
        }
      }
      targetUrl = `${apiBase}/api/v1/ticketing/events${query.size ? `?${query.toString()}` : ''}`;
    }

    const upstream = await fetch(targetUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const status = upstream.status >= 500 ? 502 : upstream.status;
      return NextResponse.json(
        {
          message:
            data?.message ||
            (status === 502
              ? UPSTREAM_ERROR_MESSAGE
              : 'Permintaan data tiket gagal diproses oleh server.'),
        },
        { status },
      );
    }

    if (!data) {
      return NextResponse.json(
        { message: UPSTREAM_ERROR_MESSAGE },
        { status: 502 },
      );
    }

    return NextResponse.json(data.data ?? data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: UPSTREAM_ERROR_MESSAGE },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isTicketingEnabled()) {
    return NextResponse.json(
      { message: 'Layanan tiket saat ini tidak aktif di lingkungan ini.' },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action as string | undefined;
  const apiBase = getInternalApiBaseUrl();

  try {
    if (action === 'verify-order') {
      const orderCode = String(body.code || body.orderCode || '').trim();
      const accessToken = String(
        body.accessToken || body.verifier || '',
      ).trim();
      const tokenQuery = accessToken
        ? `?accessToken=${encodeURIComponent(accessToken)}`
        : '';

      const upstream = await fetch(
        `${apiBase}/api/v1/ticketing/orders/${encodeURIComponent(orderCode)}${tokenQuery}`,
        {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      );

      const data = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        const status = upstream.status >= 500 ? 502 : upstream.status;
        return NextResponse.json(
          {
            message:
              data?.message ||
              (status === 502
                ? UPSTREAM_ERROR_MESSAGE
                : 'Verifikasi pesanan gagal. Pastikan kode pesanan dan token akses sesuai.'),
          },
          { status },
        );
      }

      if (!data) {
        return NextResponse.json(
          { message: UPSTREAM_ERROR_MESSAGE },
          { status: 502 },
        );
      }

      return NextResponse.json(data.data ?? data, { status: 200 });
    }

    const endpoint =
      action === 'submit-inquiry'
        ? `${apiBase}/api/v1/ticketing/public/inquiries`
        : `${apiBase}/api/v1/ticketing/checkout`;

    const payload =
      action === 'submit-inquiry'
        ? {
            organizerName: body.organizerName,
            eventName: body.eventName,
            category: body.category,
            estimatedAudience: body.estimatedAudience,
            contactName: body.contactName,
            contactEmail: body.contactEmail,
            contactWhatsapp: body.contactWhatsapp,
            notes: body.notes,
          }
        : {
            eventSlug: body.eventSlug,
            tierId: body.tierId,
            quantity: body.quantity,
            buyerName: body.buyerName,
            buyerEmail: body.buyerEmail,
            buyerWhatsapp: body.buyerWhatsapp,
            paymentMethod: body.paymentMethod,
          };

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const status = upstream.status >= 500 ? 502 : upstream.status;
      return NextResponse.json(
        {
          message:
            data?.message ||
            (status === 502
              ? UPSTREAM_ERROR_MESSAGE
              : 'Permintaan gagal diproses oleh server tiket.'),
        },
        { status },
      );
    }

    if (!data) {
      return NextResponse.json(
        { message: UPSTREAM_ERROR_MESSAGE },
        { status: 502 },
      );
    }

    return NextResponse.json(data.data ?? data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: UPSTREAM_ERROR_MESSAGE },
      { status: 502 },
    );
  }
}
