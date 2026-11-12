import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalApiBaseUrl } from '@/utils/url';
import { isValidAdminOrigin } from '@/utils/origin';

type Context = { params: Promise<{ eventId: string; wishId: string }> };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, context: Context) {
  if (!isValidAdminOrigin(request)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { eventId, wishId } = await context.params;

    if (!UUID_REGEX.test(eventId) || !wishId || typeof wishId !== 'string') {
      return NextResponse.json({ message: 'Invalid parameter' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const internalUrl = getInternalApiBaseUrl();
    const targetUrl = `${internalUrl}/api/v1/events/${eventId}/wishes/${encodeURIComponent(wishId)}`;

    const res = await fetch(targetUrl, {
      method: 'DELETE',
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
        { message: err.message || 'Gagal menghapus ucapan' },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => ({ success: true }));
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

