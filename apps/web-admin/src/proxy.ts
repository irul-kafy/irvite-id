import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { remainingSessionSeconds } from './utils/session-expiry';

export function proxy(request: NextRequest) {
  // Static assets (like template thumbnails .webp/.png) under any path must never be intercepted
  const isStaticFile = /\.(webp|png|jpg|jpeg|svg|ico|css|js|woff|woff2)$/i.test(
    request.nextUrl.pathname,
  );
  if (isStaticFile) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  const hasSession = !!token && remainingSessionSeconds(token) > 0;
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isTicketingApi = request.nextUrl.pathname.startsWith('/api/ticketing');

  if (isTicketingApi && !hasSession) {
    const response = NextResponse.json(
      { message: 'Sesi masuk diperlukan untuk mengakses layanan tiket admin.' },
      { status: 401 },
    );
    if (token) response.cookies.delete('auth_token');
    return response;
  }

  // Protect /dashboard, /events, /events/[eventId]/*, /templates, /templates/*, /staff, /staff/*, /orders
  const isProtectedPath =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/events') ||
    request.nextUrl.pathname.startsWith('/templates') ||
    request.nextUrl.pathname.startsWith('/staff') ||
    request.nextUrl.pathname.startsWith('/orders');

  if (isProtectedPath && !hasSession) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (token) response.cookies.delete('auth_token');
    return response;
  }

  if (isLoginPage && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/events/:path*',
    '/templates/:path*',
    '/staff/:path*',
    '/orders/:path*',
    '/api/ticketing',
    '/api/ticketing/:path*',
    '/login',
  ],
};
