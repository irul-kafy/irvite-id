import { NextResponse } from 'next/server';
import { remainingSessionSeconds } from '../../../../utils/session-expiry';
import { isValidAdminOrigin } from '../../../../utils/origin';
import { getInternalApiBaseUrl } from '../../../../utils/url';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Strict origin check for CSRF mitigation
    if (!isValidAdminOrigin(request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ message: 'Unsupported Media Type' }, { status: 415 });
    }

    const body = await request.json();

    const internalUrl = getInternalApiBaseUrl();
    const res = await fetch(`${internalUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: res.status }
      );
    }

    const data = await res.json();
    const { accessToken, user } = data;
    const maxAge = typeof accessToken === 'string' ? remainingSessionSeconds(accessToken) : 0;
    if (!maxAge) {
      return NextResponse.json({ message: 'Invalid authentication response' }, { status: 502 });
    }

    const response = NextResponse.json({ user });

    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error: any) {
    const internalUrl = getInternalApiBaseUrl();
    return NextResponse.json({
      message: 'Internal Server Error',
      debug: {
        error: error?.message || String(error),
        target: internalUrl,
      },
    }, { status: 500 });
  }
}
