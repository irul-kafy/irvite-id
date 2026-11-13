import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCanonicalPublicInvitationUrl, getInternalApiBaseUrl } from '@/utils/url';

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
    const res = await fetch(`${internalUrl}/events/${eventId}/invitations/stats`, {
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
      return NextResponse.json(
        { message: res.status === 403 ? 'Forbidden' : 'Not Found' },
        { status: res.status }
      );
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || 'Error fetching invitation stats' },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (data.unopenedGuests && Array.isArray(data.unopenedGuests)) {
      data.unopenedGuests = data.unopenedGuests.map((g: Record<string, unknown>) => {
        let canonicalUrl: string | null = null;
        if (typeof g.uniqueCode === 'string') {
          try {
            canonicalUrl = getCanonicalPublicInvitationUrl(g.uniqueCode);
          } catch {
            canonicalUrl = `/i/${g.uniqueCode}`;
          }
        }
        return { ...g, canonicalUrl };
      });
    }

    if (data.recentlyOpened && Array.isArray(data.recentlyOpened)) {
      data.recentlyOpened = data.recentlyOpened.map((g: Record<string, unknown>) => {
        let canonicalUrl: string | null = null;
        if (typeof g.uniqueCode === 'string') {
          try {
            canonicalUrl = getCanonicalPublicInvitationUrl(g.uniqueCode);
          } catch {
            canonicalUrl = `/i/${g.uniqueCode}`;
          }
        }
        return { ...g, canonicalUrl };
      });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error fetching invitation stats:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
