import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCanonicalPublicInvitationUrl, getInternalApiBaseUrl } from '../../../../../utils/url';

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
    const res = await fetch(`${internalUrl}/events/${eventId}/invitations`, {
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
      return NextResponse.json({ message: data.message || 'Error fetching invitations' }, { status: res.status });
    }

    const data = await res.json();
    
    // Inject canonical URL safely on the server side
    if (data.data && Array.isArray(data.data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.data = data.data.map((inv: any) => {
        let canonicalUrl: string | null = null;
        try {
          canonicalUrl = getCanonicalPublicInvitationUrl(inv.uniqueCode);
        } catch {
          canonicalUrl = null;
        }
        return {
          ...inv,
          canonicalUrl,
        };
      });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error generating canonical URL or fetching:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

