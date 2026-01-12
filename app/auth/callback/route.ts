import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('=== CALLBACK HIT ===');
  
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  
  console.log('Callback hit');
  console.log('Full URL:', requestUrl.toString());
  console.log('Code found:', code ? 'YES' : 'NO');
  console.log('Code value:', code ? `${code.substring(0, 20)}...` : 'null');
  console.log('Next param:', next || 'null');
  console.log('Origin:', requestUrl.origin);

  // If no code, redirect to login
  if (!code) {
    console.log('No code found - redirecting to login');
    let lang = 'en-US';
    if (next) {
      const langMatch = next.match(/\/([^\/]+)\//);
      if (langMatch) {
        lang = langMatch[1];
        console.log('Extracted lang from next:', lang);
      }
    }
    const loginUrl = new URL(`/${lang}/login`, requestUrl.origin);
    console.log('Redirecting to login:', loginUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  try {
    const cookieStore = await cookies();
    console.log('Cookie store obtained');
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              console.log('Cookie setAll error (can be ignored):', error);
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    console.log('Supabase client created, exchanging code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.log('Exchange Code Error:', error.message);
      console.log('Error details:', JSON.stringify(error, null, 2));
      
      // Extract lang from next URL if possible, otherwise default to en-US
      let lang = 'en-US';
      if (next) {
        const langMatch = next.match(/\/([^\/]+)\//);
        if (langMatch) {
          lang = langMatch[1];
        }
      }
      
      const loginUrl = new URL(`/${lang}/login?error=invalid_code`, requestUrl.origin);
      console.log('Redirecting to login with error:', loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }

    console.log('Code exchanged successfully!');
    console.log('User ID:', data?.user?.id || 'null');
    console.log('Session exists:', !!data?.session);

    // Successfully exchanged code for session
    // Redirect to the next URL if provided, otherwise default
    if (next) {
      // Ensure next starts with / (relative path)
      const nextPath = next.startsWith('/') ? next : `/${next}`;
      const redirectUrl = new URL(nextPath, requestUrl.origin);
      console.log('Redirecting to next URL:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
    }

    // Fallback to default locale if next is not provided
    console.log('No next param - redirecting to default locale');
    const defaultUrl = new URL('/en-US', requestUrl.origin);
    console.log('Redirecting to default:', defaultUrl.toString());
    return NextResponse.redirect(defaultUrl);

  } catch (err) {
    console.error('Unexpected error in callback:', err);
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack');
    
    // Extract lang from next URL if possible, otherwise default to en-US
    let lang = 'en-US';
    if (next) {
      const langMatch = next.match(/\/([^\/]+)\//);
      if (langMatch) {
        lang = langMatch[1];
      }
    }
    
    const loginUrl = new URL(`/${lang}/login?error=unexpected_error`, requestUrl.origin);
    console.log('Redirecting to login after unexpected error:', loginUrl.toString());
    return NextResponse.redirect(loginUrl);
  }
}
