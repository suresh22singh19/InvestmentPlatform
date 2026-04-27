import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow public routes, API routes, and static files
  const pathname = request.nextUrl.pathname;
  
  // Allow public routes (login, forgot password, reset password)
  const publicRoutes = ['/', '/forgot-password', '/reset-password'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow API routes and static files
  if (
    pathname?.startsWith('/api/') ||
    pathname?.startsWith('/_next/') ||
    pathname?.startsWith('/static/') ||
    pathname?.includes('.')
  ) {
    return NextResponse.next();
  }

  // Route protection for nurse users is handled client-side
  // since we need to access localStorage to check login_type
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

