import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCanonicalPublicInvitationUrl } from '../../../../../utils/url';

interface GuestInvitationUpstream {
  uniqueCode: string;
  status: string;
  rsvpPax?: number | null;
  attendances?: unknown[];
  [key: string]: unknown;
}

interface GuestUpstream {
  id: string;
  invitation?: GuestInvitationUpstream | null;
  [key: string]: unknown;
}

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

    // Safely allowlist only supported pagination keys: page & limit
    const url = new URL(request.url);
    const rawPage = url.searchParams.get('page');
    const rawLimit = url.searchParams.get('limit');

    const queryParams = new URLSearchParams();
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

    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const queryString = queryParams.toString();
    const targetUrl = queryString
      ? `${internalUrl}/events/${eventId}/guests?${queryString}`
      : `${internalUrl}/events/${eventId}/guests`;

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

    if (res.status === 403 || res.status === 404) {
      return NextResponse.json({ message: res.status === 403 ? 'Forbidden' : 'Not Found' }, { status: res.status });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ message: data.message || 'Error fetching guests' }, { status: res.status });
    }

    const data = await res.json();

    // Enrich guest invitation data with server-computed canonical URL
    if (data.data && Array.isArray(data.data)) {
      data.data = data.data.map((guest: GuestUpstream) => {
        if (guest.invitation && guest.invitation.uniqueCode) {
          return {
            ...guest,
            invitation: {
              ...guest.invitation,
              canonicalUrl: getCanonicalPublicInvitationUrl(guest.invitation.uniqueCode),
            },
          };
        }
        return guest;
      });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const origin = request.headers.get('origin');
    const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';

    if (origin !== expectedOrigin) {
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
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';

    const res = await fetch(`${internalUrl}/events/${eventId}/guests`, {
      method: 'POST',
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
      return NextResponse.json({ message: data.message || 'Error creating guest' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
