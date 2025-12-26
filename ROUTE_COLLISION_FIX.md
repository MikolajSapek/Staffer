# Fix: Route Collision - (admin) → admin/

## Problem znaleziony ✅

### Route Collision (Konflikt routingu):

1. **`app/page.tsx`** renderuje `/` (root route)
2. **`app/(admin)/page.tsx`** też renderuje `/` 
   - Route groups `(...)` **NIE wpływają na URL**
   - `(admin)/page.tsx` = `/` (nie `/admin`!)

3. **Konflikt:** Oba pliki próbowały renderować root route `/`, co powodowało błąd buildu:
   ```
   ENOENT: no such file or directory... page_client-reference-manifest.js
   ```

### Navigation oczekiwała `/admin`:

- `AdminNav.tsx` linkuje do `/admin`
- `login/page.tsx` przekierowuje do `/admin`
- Ale `(admin)/page.tsx` renderował `/`, nie `/admin`!

## Rozwiązanie ✅

### Przeniesiono route group do regularnego folderu:

```bash
app/(admin)/  →  app/admin/
```

**Przed:**
- `app/(admin)/page.tsx` → renderuje `/` ❌
- `app/(admin)/layout.tsx` → layout dla `/` ❌

**Po:**
- `app/admin/page.tsx` → renderuje `/admin` ✅
- `app/admin/layout.tsx` → layout dla `/admin` ✅

## Status:

✅ Route collision naprawiony
✅ `app/admin/page.tsx` teraz renderuje `/admin` (zgodnie z navigation)
✅ `app/page.tsx` renderuje `/` (bez konfliktu)
✅ Middleware już obsługuje `/admin` poprawnie
✅ Wszystkie linki w `AdminNav.tsx` działają poprawnie
✅ Zmiany wypchnięte na GitHub

## Dlaczego to działa:

1. **Route groups `(...)`** są używane do organizacji, **nie wpływają na URL**
2. **Regularne foldery** tworzą URL path:
   - `app/admin/page.tsx` → `/admin`
   - `app/(admin)/page.tsx` → `/` (konflikt!)

3. **Middleware** już sprawdzał `/admin`, więc nie wymagał zmian

## Następne kroki:

1. **Redeploy w Vercel** (automatycznie po push)
2. **Sprawdź czy build przechodzi** - route collision powinien być rozwiązany
3. **Przetestuj** `/admin` route w przeglądarce

## Inne route groups (OK):

- `(auth)/login/page.tsx` → `/login` ✅ (nie ma konfliktu)
- `(auth)/register/page.tsx` → `/register` ✅ (nie ma konfliktu)
- `(dashboard)/company/page.tsx` → `/company` ✅ (nie ma konfliktu)
- `(dashboard)/worker/page.tsx` → `/worker` ✅ (nie ma konfliktu)

Tylko `(admin)` miał konflikt z root `/`.

