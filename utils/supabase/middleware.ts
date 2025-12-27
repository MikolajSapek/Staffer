import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  // 1. Inicjalizacja odpowiedzi
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

  // 2. Sprawdzenie użytkownika
  // WAŻNE: getUser jest bezpieczniejsze niż getSession w middleware
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // -------------------------------------------------------------------
  // POPRAWKA: Precyzyjna definicja publicznych tras
  // Usuwamy '/' z tablicy startsWith, sprawdzamy go osobno
  // -------------------------------------------------------------------
  const isPublicRoute =
    pathname === '/' || // Tylko strona główna (dokładne dopasowanie)
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth'); // Obsługa callbacków OAuth/MagicLink

  // SCENARIUSZ A: Niezalogowany wchodzi na prywatną stronę -> LOGIN
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // SCENARIUSZ B: Zalogowany wchodzi na publiczną stronę (np. Login lub Home) -> DASHBOARD
  if (user && isPublicRoute) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const profileData = profile as { role: 'worker' | 'company' | 'admin' };
        const url = request.nextUrl.clone();
        
        // Przekierowanie bazujące na roli
        switch (profileData.role) {
          case 'worker':
            url.pathname = '/worker';
            break;
          case 'company':
            url.pathname = '/company';
            break;
          case 'admin':
            url.pathname = '/admin';
            break;
          default:
            // Jeśli rola jest nieznana, pozwól zostać lub wyślij do onboardingu
            return supabaseResponse; 
        }
        return NextResponse.redirect(url);
      } else {
        // Brak profilu - przekieruj do onboardingu
        // Spróbuj uzyskać rolę z user_metadata (zapisywana podczas rejestracji)
        const role = user.user_metadata?.role as 'worker' | 'company' | undefined;
        const url = request.nextUrl.clone();
        
        if (role === 'company') {
          url.pathname = '/company/onboarding';
        } else if (role === 'worker') {
          url.pathname = '/worker/onboarding';
        } else {
          // Jeśli nie ma roli w metadata, zostaw na stronie (może wybrać podczas rejestracji)
          return supabaseResponse;
        }
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('Błąd pobierania profilu w middleware:', error);
      // W razie błędu nie blokujemy, pozwalamy wejść na stronę (fail-open dla UX, fail-closed dla security - zależnie od preferencji)
    }
  }

  // SCENARIUSZ C: Zalogowany wchodzi na prywatną stronę -> Sprawdzamy uprawnienia ról
  if (user && !isPublicRoute) {
    try {
      // Opcjonalnie: Cache'owanie tego zapytania byłoby idealne, ale w middleware Next.js jest to trudne.
      // Supabase jest szybkie, więc pojedyncze zapytanie select('role') jest akceptowalne.
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const profileData = profile as { role: 'worker' | 'company' | 'admin' };
        const role = profileData.role;

        // Ochrona tras Company
        if (pathname.startsWith('/company') && role !== 'company' && role !== 'admin') {
          const url = request.nextUrl.clone();
          // Przekierowanie do właściwego dashboardu na podstawie roli użytkownika
          if (role === 'worker') {
            url.pathname = '/worker';
          } else {
            url.pathname = '/unauthorized';
          }
          return NextResponse.redirect(url);
        }

        // Ochrona tras Worker
        if (pathname.startsWith('/worker') && role !== 'worker' && role !== 'admin') {
          const url = request.nextUrl.clone();
          // Przekierowanie do właściwego dashboardu na podstawie roli użytkownika
          if (role === 'company') {
            url.pathname = '/company';
          } else {
            url.pathname = '/unauthorized';
          }
          return NextResponse.redirect(url);
        }

        // Ochrona tras Admin
        if (pathname.startsWith('/admin') && role !== 'admin') {
          const url = request.nextUrl.clone();
          // Przekierowanie do właściwego dashboardu na podstawie roli użytkownika
          if (role === 'worker') {
            url.pathname = '/worker';
          } else if (role === 'company') {
            url.pathname = '/company';
          } else {
            url.pathname = '/unauthorized';
          }
          return NextResponse.redirect(url);
        }
      } else {
        // Brak profilu - przekieruj do onboardingu
        // Sprawdź, czy użytkownik próbuje wejść na stronę onboarding (nie blokuj tego)
        if (pathname.startsWith('/worker/onboarding') || pathname.startsWith('/company/onboarding')) {
          return supabaseResponse; // Pozwól wejść na onboarding
        }

        // Spróbuj uzyskać rolę z user_metadata (zapisywana podczas rejestracji)
        const role = user.user_metadata?.role as 'worker' | 'company' | undefined;
        const url = request.nextUrl.clone();
        
        if (role === 'company') {
          url.pathname = '/company/onboarding';
        } else if (role === 'worker') {
          url.pathname = '/worker/onboarding';
        } else {
          // Jeśli nie ma roli, przekieruj do strony głównej (użytkownik musi wybrać rolę)
          url.pathname = '/';
        }
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('Błąd weryfikacji roli:', error);
    }
  }

  return supabaseResponse;
}