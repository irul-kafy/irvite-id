import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type Context = { params: Promise<{ eventId: string }> };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: Context) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { eventId } = await context.params;
  if (!UUID_REGEX.test(eventId)) {
    return NextResponse.json({ message: 'Invalid event' }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const query = url.search;
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const response = await fetch(internalUrl + '/events/' + eventId + '/media' + query, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
      },
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
    return NextResponse.json({ message: 'Gagal mengakses media acara.' }, { status: 502 });
  }
}

export async function POST(request: Request, context: Context) {
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

  const { eventId } = await context.params;
  if (!UUID_REGEX.test(eventId)) {
    return NextResponse.json({ message: 'Invalid event' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'File is required' }, { status: 400 });
    }

    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const response = await fetch(internalUrl + '/events/' + eventId + '/media', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
      },
      body: formData,
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
    return NextResponse.json({ message: 'Gagal mengunggah media acara.' }, { status: 502 });
  }
}