import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'

const locales = ['en-US', 'da']
const defaultLocale = 'en-US'

function getLocale(request: NextRequest): string {
  // Check if locale is already in the path
  const pathname = request.nextUrl.pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    // Extract locale from pathname
    const pathLocale = pathname.split('/')[1]
    if (locales.includes(pathLocale)) {
      return pathLocale
    }
  }

  // Get locale from Accept-Language header
  const negotiatorHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value
  })

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages()
  return match(languages, locales, defaultLocale)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip locale handling for auth routes (e.g., /auth/callback)
  // These routes should not have locale prefixes
  if (pathname.startsWith('/auth')) {
    // Only handle Supabase session for auth routes
    return await updateSession(request)
  }

  // First, handle i18n routing
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request)
    const newUrl = new URL(`/${locale}${pathname}`, request.url)
    // Preserve query parameters
    newUrl.search = request.nextUrl.search
    return NextResponse.redirect(newUrl)
  }

  // Then handle Supabase session
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
