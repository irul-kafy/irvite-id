import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiBaseUrl } from '@/api/client';
import { isTicketingEnabled } from '@/config/features';

const UPSTREAM_ERROR_MESSAGE =
  'Layanan server tiket sedang tidak dapat dihubungi (502). Silakan coba lagi.';

function jsonWithNoReferrer(body: unknown, status: number): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export async function GET(request: NextRequest) {
  if (!isTicketingEnabled()) {
    return jsonWithNoReferrer(
      { message: 'Layanan tiket saat ini tidak aktif di lingkungan ini.' },
      404,
    );
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || undefined;
  const orderCode = searchParams.get('orderCode') || undefined;
  const inquiryCode = searchParams.get('inquiryCode') || undefined;
  const accessToken =
    request.headers.get('x-access-token') ||
    searchParams.get('accessToken') ||
    undefined;
  const apiBase = getInternalApiBaseUrl();

  try {
    let targetUrl: string;
    const headers: Record<string, string> = {};

    if (orderCode) {
      if (accessToken) {
        headers['X-Access-Token'] = accessToken;
      }
      targetUrl = `${apiBase}/api/v1/ticketing/orders/${encodeURIComponent(orderCode)}`;
    } else if (inquiryCode) {
      if (accessToken) {
        headers['X-Access-Token'] = accessToken;
      }
      targetUrl = `${apiBase}/api/v1/ticketing/public/inquiries/${encodeURIComponent(inquiryCode)}`;
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
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const status = upstream.status >= 500 ? 502 : upstream.status;
      return jsonWithNoReferrer(
        {
          message:
            data?.message ||
            (status === 502
              ? UPSTREAM_ERROR_MESSAGE
              : 'Permintaan data tiket gagal diproses oleh server.'),
        },
        status,
      );
    }

    if (!data) {
      return jsonWithNoReferrer({ message: UPSTREAM_ERROR_MESSAGE }, 502);
    }

    return jsonWithNoReferrer(data.data ?? data, 200);
  } catch {
    return jsonWithNoReferrer({ message: UPSTREAM_ERROR_MESSAGE }, 502);
  }
}

export async function POST(request: NextRequest) {
  if (!isTicketingEnabled()) {
    return jsonWithNoReferrer(
      { message: 'Layanan tiket saat ini tidak aktif di lingkungan ini.' },
      404,
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

      const upstream = await fetch(
        `${apiBase}/api/v1/ticketing/orders/${encodeURIComponent(orderCode)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'X-Access-Token': accessToken } : {}),
          },
          body: JSON.stringify({ accessToken }),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      );

      const data = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        const status = upstream.status >= 500 ? 502 : upstream.status;
        return jsonWithNoReferrer(
          {
            message:
              data?.message ||
              (status === 502
                ? UPSTREAM_ERROR_MESSAGE
                : 'Verifikasi pesanan gagal. Pastikan kode pesanan dan token akses sesuai.'),
          },
          status,
        );
      }

      if (!data) {
        return jsonWithNoReferrer({ message: UPSTREAM_ERROR_MESSAGE }, 502);
      }

      return jsonWithNoReferrer(data.data ?? data, 200);
    }

    if (action === 'check-inquiry') {
      const inquiryCode = String(body.inquiryCode || body.code || '').trim();
      const accessToken = String(
        body.accessToken || body.verifier || '',
      ).trim();

      const upstream = await fetch(
        `${apiBase}/api/v1/ticketing/public/inquiries/${encodeURIComponent(inquiryCode)}`,
        {
          method: 'GET',
          headers: accessToken ? { 'X-Access-Token': accessToken } : {},
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      );

      const data = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        const status = upstream.status >= 500 ? 502 : upstream.status;
        return jsonWithNoReferrer(
          {
            message:
              data?.message ||
              (status === 502
                ? UPSTREAM_ERROR_MESSAGE
                : 'Gagal memeriksa status pengajuan acara.'),
          },
          status,
        );
      }

      if (!data) {
        return jsonWithNoReferrer({ message: UPSTREAM_ERROR_MESSAGE }, 502);
      }

      return jsonWithNoReferrer(data.data ?? data, 200);
    }

    if (action === 'quote') {
      const eventSlug = String(body.eventSlug || body.slug || '').trim();
      const upstream = await fetch(
        `${apiBase}/api/v1/ticketing/events/${encodeURIComponent(eventSlug)}/quote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tierId: body.tierId,
            quantity: body.quantity,
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      );

      const data = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        const status = upstream.status >= 500 ? 502 : upstream.status;
        return jsonWithNoReferrer(
          {
            message:
              data?.message ||
              (status === 502
                ? UPSTREAM_ERROR_MESSAGE
                : 'Gagal memuat rincian biaya tiket dari server.'),
          },
          status,
        );
      }

      if (!data) {
        return jsonWithNoReferrer({ message: UPSTREAM_ERROR_MESSAGE }, 502);
      }

      return jsonWithNoReferrer(data.data ?? data, 200);
    }

    const isSubmitInquiry = action === 'submit-inquiry';
    const endpoint = isSubmitInquiry
      ? `${apiBase}/api/v1/ticketing/public/inquiries`
      : `${apiBase}/api/v1/ticketing/checkout`;

    const payload = isSubmitInquiry
      ? {
          organizerName: body.organizerName,
          eventName: body.eventName,
          category: body.category,
          estimatedAudience: body.estimatedAudience,
          contactName: body.contactName || body.organizerName,
          ...(body.contactEmail ? { contactEmail: body.contactEmail } : {}),
          contactWhatsapp: body.contactWhatsapp,
          ...(body.notes ? { notes: body.notes } : {}),
          ...(body.website !== undefined ? { website: body.website } : {}),
        }
      : {
          eventSlug: body.eventSlug,
          tierId: body.tierId,
          quantity: body.quantity,
          buyerName: body.buyerName,
          buyerEmail: body.buyerEmail,
          buyerWhatsapp: body.buyerWhatsapp,
          paymentMethod: body.paymentMethod,
          ...(Array.isArray(body.holderNames)
            ? { holderNames: body.holderNames }
            : {}),
        };

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const status =
        upstream.status === 503
          ? 503
          : upstream.status >= 500
            ? 502
            : upstream.status;
      return jsonWithNoReferrer(
        {
          message:
            data?.message ||
            (status === 503
              ? 'Pembayaran belum tersedia.'
              : status === 502
                ? UPSTREAM_ERROR_MESSAGE
                : 'Permintaan gagal diproses oleh server tiket.'),
        },
        status,
      );
    }

    if (!data) {
      return jsonWithNoReferrer({ message: UPSTREAM_ERROR_MESSAGE }, 502);
    }

    return jsonWithNoReferrer(data.data ?? data, isSubmitInquiry ? 200 : 201);
  } catch {
    return jsonWithNoReferrer({ message: UPSTREAM_ERROR_MESSAGE }, 502);
  }
}
