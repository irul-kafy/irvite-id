import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { remainingSessionSeconds } from './utils/session-expiry';
import {
  isPreviewApiUnconfigured,
  PREVIEW_API_UNCONFIGURED_MESSAGE,
} from './utils/url';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (isPreviewApiUnconfigured()) {
      return NextResponse.json(
        {
          message: PREVIEW_API_UNCONFIGURED_MESSAGE,
          error: PREVIEW_API_UNCONFIGURED_MESSAGE,
        },
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  // Static assets (like template thumbnails .webp/.png) under any path must never be intercepted
  const isStaticFile = /\.(webp|png|jpg|jpeg|svg|ico|css|js|woff|woff2)$/i.test(request.nextUrl.pathname);
  if (isStaticFile) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  const hasSession = !!token && remainingSessionSeconds(token) > 0;
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  
  // Protect /dashboard, /events, /events/[eventId]/*, /templates, /templates/*, /staff, /staff/*, /orders, /orders/*, /pricing, /pricing/*, /activity-logs, /activity-logs/*
  const isProtectedPath = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/events') ||
    request.nextUrl.pathname.startsWith('/templates') ||
    request.nextUrl.pathname.startsWith('/staff') ||
    request.nextUrl.pathname.startsWith('/orders') ||
    request.nextUrl.pathname.startsWith('/pricing') ||
    request.nextUrl.pathname.startsWith('/activity-logs');

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
    '/api/:path*',
    '/dashboard/:path*',
    '/events/:path*',
    '/templates/:path*',
    '/staff/:path*',
    '/orders/:path*',
    '/pricing/:path*',
    '/activity-logs/:path*',
    '/login',
  ],
};
