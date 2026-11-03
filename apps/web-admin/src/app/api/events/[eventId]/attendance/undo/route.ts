import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function isAllowedOrigin(origin: string | null, request: Request): boolean {
  if (!origin) return false;
  const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';
  if (origin === expectedOrigin) return true;

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    return true;
  }

  try {
    const url = new URL(origin);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    if (url.hostname === 'irvite-id.vercel.app') return true;
    if (url.hostname.startsWith('irvite-') && url.hostname.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }
  return false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  try {
    const origin = request.headers.get('origin');
    if (!isAllowedOrigin(origin, request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ message: 'Unsupported Media Type' }, { status: 415 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';

    const res = await fetch(`${internalUrl}/events/${eventId}/attendance/undo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: body.code,
        invitationId: body.invitationId,
        guestId: body.guestId,
      }),
    });

    if (res.status === 401) {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }

    if (res.status === 403) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || 'Gagal mengurungkan check-in' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
