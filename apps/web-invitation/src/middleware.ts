import { NextResponse, type NextRequest } from 'next/server';
import { isTicketingEnabled } from './config/features';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Jika ticketing dinonaktifkan (misal di Hosting / Vercel),
  // lindungi rute /tiket dan /partnership dengan mengalihkan pengunjung ke Beranda Undangan.
  if (!isTicketingEnabled()) {
    if (
      pathname === '/tiket' ||
      pathname.startsWith('/tiket/') ||
      pathname === '/partnership' ||
      pathname.startsWith('/partnership/')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/tiket',
    '/tiket/:path*',
    '/partnership',
    '/partnership/:path*',
  ],
};
