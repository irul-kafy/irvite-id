import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminOrigin } from '@/utils/origin';
import { getInternalApiBaseUrl } from '@/utils/url';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  try {
    if (!isValidAdminOrigin(request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ message: 'Unsupported Media Type' }, { status: 415 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const internalUrl = getInternalApiBaseUrl();

    const payload = {
      name: body.name,
      pax: body.pax,
      category: body.category,
      tableNumber: body.tableNumber,
    };

    let res = await fetch(`${internalUrl}/events/${eventId}/attendance/walk-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 404) {
      res = await fetch(`${internalUrl}/api/v1/events/${eventId}/attendance/walk-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    if (res.status === 401) {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || 'Anda tidak memiliki akses ke acara ini' },
        { status: 403 }
      );
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || 'Gagal mendaftarkan tamu dadakan' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

