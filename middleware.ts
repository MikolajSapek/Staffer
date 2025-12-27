import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    // Fallback if middleware fails - allow request to proceed
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

