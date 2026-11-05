import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCanonicalPublicEventUrl, getCanonicalClientPortalUrl, getInternalApiBaseUrl } from '@/utils/url';
import { isValidAdminOrigin } from '@/utils/origin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const internalUrl = getInternalApiBaseUrl();
    const res = await fetch(`${internalUrl}/events/${eventId}`, {
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

    if (res.status === 403 || res.status === 404) {
      return NextResponse.json({ message: res.status === 403 ? 'Forbidden' : 'Not Found' }, { status: res.status });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ message: data.message || 'Error fetching event' }, { status: res.status });
    }

    const data = await res.json();
    let canonicalUrl: string | null = null;
    if (data?.slug) {
      try {
        canonicalUrl = getCanonicalPublicEventUrl(data.slug);
      } catch {
        canonicalUrl = null;
      }
    }

    let clientPortalUrl: string | null = null;
    if (data?.id && data?.clientKey) {
      try {
        clientPortalUrl = getCanonicalClientPortalUrl(data.id, data.clientKey);
      } catch {
        clientPortalUrl = null;
      }
    }

    return NextResponse.json({
      ...data,
      canonicalUrl,
      clientPortalUrl,
    });
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    if (!isValidAdminOrigin(request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ message: 'Unsupported Media Type' }, { status: 415 });
    }

    const { eventId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const internalUrl = getInternalApiBaseUrl();

    const res = await fetch(`${internalUrl}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }

    if (res.status === 403 || res.status === 404) {
      return NextResponse.json({ message: res.status === 403 ? 'Forbidden' : 'Not Found' }, { status: res.status });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ message: data.message || 'Error updating event' }, { status: res.status });
    }

    const data = await res.json();
    let clientPortalUrl: string | null = null;
    if (data?.id && data?.clientKey) {
      try {
        clientPortalUrl = getCanonicalClientPortalUrl(data.id, data.clientKey);
      } catch {
        clientPortalUrl = null;
      }
    }

    return NextResponse.json({
      ...data,
      clientPortalUrl,
    });
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    if (!isValidAdminOrigin(request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { eventId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const internalUrl = getInternalApiBaseUrl();

    const res = await fetch(`${internalUrl}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }

    if (res.status === 403 || res.status === 404) {
      return NextResponse.json({ message: res.status === 403 ? 'Forbidden' : 'Not Found' }, { status: res.status });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ message: data.message || 'Error archiving event' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
