import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { remainingSessionSeconds } from './utils/session-expiry';

export function proxy(request: NextRequest) {
  // Static assets (like template thumbnails .webp/.png) under any path must never be intercepted
  const isStaticFile = /\.(webp|png|jpg|jpeg|svg|ico|css|js|woff|woff2)$/i.test(request.nextUrl.pathname);
  if (isStaticFile) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  const hasSession = !!token && remainingSessionSeconds(token) > 0;
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  
  // Protect /dashboard, /events, /events/[eventId]/*, /templates, /templates/*, /staff, /staff/*
  const isProtectedPath = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/events') ||
    request.nextUrl.pathname.startsWith('/templates') ||
    request.nextUrl.pathname.startsWith('/staff');

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
  matcher: ['/dashboard/:path*', '/events/:path*', '/templates/:path*', '/staff/:path*', '/login'],
};
