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
    pathname === route || pathname.startsWith(route + '/')
  );

  // Static assets and API routes - allow through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api')
  ) {
    return supabaseResponse;
  }

  // Protected routes - redirect to login if not authenticated
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role-based route protection and redirects
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        const profileData = profile as { role: 'worker' | 'company' | 'admin' };
        const userRole = profileData.role;

        // Define allowed paths for each role
        const workerPaths = ['/worker', '/worker/onboarding'];
        const companyPaths = ['/company', '/company/onboarding'];
        const adminPaths = ['/admin', '/worker', '/company'];

        // Check if user is accessing root or trying to access wrong role's area
        if (pathname === '/' || (!isPublicRoute && !pathname.startsWith('/worker') && !pathname.startsWith('/company') && !pathname.startsWith('/admin'))) {
          // Redirect to appropriate dashboard based on role
          if (userRole === 'worker') {
            const url = request.nextUrl.clone();
            url.pathname = '/worker/dashboard';
            return NextResponse.redirect(url);
          } else if (userRole === 'company') {
            const url = request.nextUrl.clone();
            url.pathname = '/company/dashboard';
            return NextResponse.redirect(url);
          } else if (userRole === 'admin') {
            const url = request.nextUrl.clone();
            url.pathname = '/admin';
            return NextResponse.redirect(url);
          }
        }

        // Redirect /worker to /worker/dashboard for workers
        if (userRole === 'worker' && pathname === '/worker') {
          const url = request.nextUrl.clone();
          url.pathname = '/worker/dashboard';
          return NextResponse.redirect(url);
        }

        // Redirect /company to /company/dashboard for companies
        if (userRole === 'company' && pathname === '/company') {
          const url = request.nextUrl.clone();
          url.pathname = '/company/dashboard';
          return NextResponse.redirect(url);
        }

        // Company routes - restrict access
        if (
          pathname.startsWith('/company') &&
          userRole !== 'company' &&
          userRole !== 'admin'
        ) {
          const url = request.nextUrl.clone();
          url.pathname = '/unauthorized';
          return NextResponse.redirect(url);
        }

        // Worker routes - restrict access
        if (
          pathname.startsWith('/worker') &&
          userRole !== 'worker' &&
          userRole !== 'admin'
        ) {
          const url = request.nextUrl.clone();
          url.pathname = '/unauthorized';
          return NextResponse.redirect(url);
        }

        // Admin routes - restrict access
        if (pathname.startsWith('/admin') && userRole !== 'admin') {
          const url = request.nextUrl.clone();
          url.pathname = '/unauthorized';
          return NextResponse.redirect(url);
        }
      }
    } catch (error) {
      // If profile fetch fails, allow request to proceed (will be handled by RoleProtector)
      // This prevents middleware from breaking the build
      console.error('Middleware profile fetch error:', error);
    }
  }

  return supabaseResponse;
}

