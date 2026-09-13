import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type Context = { params: Promise<{ eventId: string; mediaId: string }> };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: Context) {
  const origin = request.headers.get('origin');
  const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';
  if (origin !== expectedOrigin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { eventId, mediaId } = await context.params;
  if (!UUID_REGEX.test(eventId) || !UUID_REGEX.test(mediaId)) {
    return NextResponse.json({ message: 'Invalid media' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const response = await fetch(internalUrl + '/events/' + eventId + '/media/' + mediaId, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    const result = NextResponse.json(data, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });

    if (response.status === 401) {
      result.cookies.delete('auth_token');
    }

    return result;
  } catch {
    return NextResponse.json({ message: 'Gagal memperbarui media acara.' }, { status: 502 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const origin = request.headers.get('origin');
  const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';
  if (origin !== expectedOrigin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { eventId, mediaId } = await context.params;
  if (!UUID_REGEX.test(eventId) || !UUID_REGEX.test(mediaId)) {
    return NextResponse.json({ message: 'Invalid media' }, { status: 400 });
  }

  try {
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const response = await fetch(internalUrl + '/events/' + eventId + '/media/' + mediaId, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + token,
      },
      cache: 'no-store',
    });

    if (response.status === 204) {
      return new Response(null, { status: 204 });
    }

    const data = await response.json().catch(() => ({}));
    const result = NextResponse.json(data, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });

    if (response.status === 401) {
      result.cookies.delete('auth_token');
    }

    return result;
  } catch {
    return NextResponse.json({ message: 'Gagal menghapus media acara.' }, { status: 502 });
  }
}