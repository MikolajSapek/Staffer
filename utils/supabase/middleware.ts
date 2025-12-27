import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/', '/unauthorized'];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (user && (pathname === '/login' || pathname.startsWith('/login/') || pathname === '/register' || pathname.startsWith('/register/'))) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        const profileData = profile as { role: 'worker' | 'company' | 'admin' };
        const url = request.nextUrl.clone();
        
        // Redirect to appropriate dashboard based on role
        if (profileData.role === 'company') {
          url.pathname = '/company';
        } else if (profileData.role === 'worker') {
          url.pathname = '/worker';
        } else if (profileData.role === 'admin') {
          url.pathname = '/admin';
        } else {
          url.pathname = '/';
        }
        
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // If profile fetch fails, redirect to home
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // Protected routes - redirect to login if not authenticated
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role-based route protection (only if user is authenticated)
  if (user && !isPublicRoute) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        const profileData = profile as { role: 'worker' | 'company' | 'admin' };
        const url = request.nextUrl.clone();

        // Company routes
        if (
          pathname.startsWith('/company') &&
          profileData.role !== 'company' &&
          profileData.role !== 'admin'
        ) {
          url.pathname = '/unauthorized';
          return NextResponse.redirect(url);
        }

        // Worker routes
        if (
          pathname.startsWith('/worker') &&
          profileData.role !== 'worker' &&
          profileData.role !== 'admin'
        ) {
          url.pathname = '/unauthorized';
          return NextResponse.redirect(url);
        }

        // Admin routes
        if (pathname.startsWith('/admin') && profileData.role !== 'admin') {
          url.pathname = '/unauthorized';
          return NextResponse.redirect(url);
        }
      } else {
        // If profile doesn't exist, redirect to home
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // If profile fetch fails and user is trying to access protected route, redirect to home
      // This prevents infinite loops
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

