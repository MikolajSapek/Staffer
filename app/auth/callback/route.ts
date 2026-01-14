import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Negotiator from 'negotiator';
import { match } from '@formatjs/intl-localematcher';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

const locales = ['en-US', 'da'];
const defaultLocale = 'en-US';

/**
 * Detects locale from request headers (Accept-Language)
 */
function detectLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value;
  });

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return match(languages, locales, defaultLocale);
}

/**
 * Validates and sanitizes the 'next' parameter to prevent open redirect attacks
 * @param next - The next parameter from URL
 * @returns Validated relative path or null if invalid
 */
function validateNextParam(next: string | null): string | null {
  if (!next) return null;

  // Remove any leading/trailing whitespace
  const trimmed = next.trim();
  if (!trimmed) return null;

  // Must start with / (relative path)
  if (!trimmed.startsWith('/')) return null;

  // Must not contain protocol (http://, https://)
  if (trimmed.match(/^https?:\/\//i)) return null;

  // Must not contain // (could be used for protocol-relative URLs)
  if (trimmed.includes('//')) return null;

  // Must not contain @ (could be used for email-like URLs)
  if (trimmed.includes('@')) return null;

  // Must not contain : except after / (to prevent protocol-like strings)
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex > 0 && colonIndex < trimmed.indexOf('/')) return null;

  // Must not contain domain-like patterns
  if (trimmed.match(/\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) return null;

  return trimmed;
}

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
    const locale = detectLocale(request);
    const loginUrl = new URL(`/${locale}/login`, requestUrl.origin);
    loginUrl.searchParams.set('error', 'missing_code');
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
      
      const locale = detectLocale(request);
      const loginUrl = new URL(`/${locale}/login`, requestUrl.origin);
      loginUrl.searchParams.set('error', 'invalid_code');
      console.log('Redirecting to login with error:', loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }

    console.log('Code exchanged successfully!');
    console.log('User ID:', data?.user?.id || 'null');
    console.log('Session exists:', !!data?.session);

    // Successfully exchanged code for session
    const locale = detectLocale(request);
    
    // Validate and sanitize the 'next' parameter to prevent open redirect attacks
    const validatedNext = validateNextParam(next);
    
    if (validatedNext) {
      // Ensure the validated path starts with locale if it doesn't already
      let redirectPath = validatedNext;
      
      // Check if path already has a locale prefix
      const hasLocale = locales.some(
        (loc) => redirectPath.startsWith(`/${loc}/`) || redirectPath === `/${loc}`
      );
      
      // If no locale in path, add the detected locale
      if (!hasLocale) {
        redirectPath = `/${locale}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`;
      }
      
      const redirectUrl = new URL(redirectPath, requestUrl.origin);
      redirectUrl.searchParams.set('verified', 'true');
      console.log('Redirecting to validated next URL:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
    }

    // Fallback: redirect to login with verified parameter
    // If user has a role, redirect to appropriate dashboard
    const userRole = data?.user?.user_metadata?.role;
    let fallbackPath = `/${locale}/login`;
    
    if (userRole === 'company') {
      // Company dashboard is at /(company)/dashboard
      fallbackPath = `/${locale}/company/dashboard`;
    } else if (userRole === 'worker') {
      // Worker's main page is the job board at root
      fallbackPath = `/${locale}`;
    }
    
    console.log('No valid next param - redirecting to:', fallbackPath);
    const redirectUrl = new URL(fallbackPath, requestUrl.origin);
    redirectUrl.searchParams.set('verified', 'true');
    console.log('Redirecting to:', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error('Unexpected error in callback:', err);
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack');
    
    const locale = detectLocale(request);
    const loginUrl = new URL(`/${locale}/login`, requestUrl.origin);
    loginUrl.searchParams.set('error', 'unexpected_error');
    console.log('Redirecting to login after unexpected error:', loginUrl.toString());
    return NextResponse.redirect(loginUrl);
  }
}
