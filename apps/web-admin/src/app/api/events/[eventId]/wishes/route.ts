import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalApiBaseUrl } from '@/utils/url';
import { isValidAdminOrigin } from '@/utils/origin';

type Context = { params: Promise<{ eventId: string }> };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: Context) {
  try {
    const { eventId } = await context.params;

    if (!UUID_REGEX.test(eventId)) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const rawPage = url.searchParams.get('page');
    const rawLimit = url.searchParams.get('limit');

    const queryParams = new URLSearchParams();
    if (search && search.trim()) {
      queryParams.set('search', search.trim());
    }
    if (rawPage !== null) {
      const parsedPage = parseInt(rawPage, 10);
      if (!Number.isNaN(parsedPage) && parsedPage >= 1) {
        queryParams.set('page', String(parsedPage));
      }
    }
    if (rawLimit !== null) {
      const parsedLimit = parseInt(rawLimit, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100) {
        queryParams.set('limit', String(parsedLimit));
      }
    }

    const internalUrl = getInternalApiBaseUrl();
    const qs = queryParams.toString();
    const targetUrl = qs
      ? `${internalUrl}/api/v1/events/${eventId}/wishes?${qs}`
      : `${internalUrl}/api/v1/events/${eventId}/wishes`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: err.message || 'Gagal memuat daftar ucapan' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
