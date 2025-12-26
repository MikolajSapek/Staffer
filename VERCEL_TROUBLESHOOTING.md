# Vercel Build Error - Troubleshooting Guide

## Błąd:
```
ENOENT: no such file or directory, lstat '/vercel/path0/.next/server/app/(admin)/page_client-reference-manifest.js'
```

## Możliwe przyczyny:

1. **Route Groups w Next.js 15** - Vercel może mieć problemy z route groups `(admin)`, `(auth)`, `(dashboard)`
2. **Middleware z Supabase** - Edge Runtime warnings mogą powodować problemy
3. **Brakujące zmienne środowiskowe** - Build może się nie powieść jeśli brakuje env vars

## Rozwiązania (w kolejności):

### 1. Upewnij się, że zmienne środowiskowe są ustawione:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Sprawdź logi build w Vercel:
- Przejdź do Deployments → [twój deployment] → Build Logs
- Szukaj błędów TypeScript lub importów

### 3. Jeśli problem nadal występuje - Tymczasowe rozwiązanie:

**Opcja A: Uprość middleware (tylko do testów)**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Tymczasowo wyłączone - tylko do debugowania
  return NextResponse.next();
}
```

**Opcja B: Sprawdź czy wszystkie route groups mają poprawne eksporty**

### 4. Sprawdź wersję Node.js w Vercel:
- Settings → General → Node.js Version
- Ustaw na 18.x lub 20.x

### 5. Sprawdź czy nie ma problemów z zależnościami:
```bash
# Lokalnie sprawdź czy build działa
npm run build
```

## Co zostało naprawione:

✅ Middleware ma lepszą obsługę błędów
✅ Next.js config zaktualizowany
✅ Vercel config poprawiony
✅ Wszystkie błędy TypeScript naprawione

## Następne kroki:

1. **Redeploy w Vercel** (automatycznie po push)
2. **Sprawdź logi build** w Vercel Dashboard
3. **Jeśli nadal błąd**, sprawdź czy wszystkie route groups mają poprawne layouty

## Jeśli nic nie pomaga:

Możesz spróbować:
1. Tymczasowo usunąć route groups i użyć zwykłych folderów
2. Sprawdzić czy problem jest z konkretnym route group
3. Skontaktować się z supportem Vercel z logami build

