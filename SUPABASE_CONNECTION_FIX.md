# Fix: ERR_NAME_NOT_RESOLVED - Supabase Connection Error

## Problem:
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
TypeError: Failed to fetch
```

## Przyczyna:
Aplikacja nie może połączyć się z Supabase, ponieważ:
1. **Brakujące zmienne środowiskowe** w Vercel
2. **Nieprawidłowe wartości** zmiennych środowiskowych
3. **Zmienne nie zostały zaktualizowane** po redeploy

## Rozwiązanie:

### Krok 1: Sprawdź zmienne środowiskowe w Vercel

1. **Vercel Dashboard** → Twój projekt → **Settings** → **Environment Variables**

2. **Sprawdź czy masz:**
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Sprawdź wartości:**
   - `NEXT_PUBLIC_SUPABASE_URL` powinien wyglądać: `https://xxxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` powinien być długim kluczem zaczynającym się od `eyJ...`

### Krok 2: Jeśli brakuje zmiennych - dodaj je

1. **Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Wybierz swój projekt
   - **Settings** → **API**

2. **Skopiuj wartości:**
   - **Project URL** → to jest `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → to jest `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Dodaj w Vercel:**
   - Vercel Dashboard → Settings → Environment Variables
   - Kliknij "Add Another"
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Wklej URL z Supabase
   - **Environments:** Zaznacz wszystkie (Production, Preview, Development)
   - **Save**

   Powtórz dla `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Krok 3: Redeploy z nowymi zmiennymi

1. **Vercel Dashboard** → **Deployments**
2. Kliknij **"Redeploy"** przy ostatnim deployment
3. **WAŻNE:** Zaznacz **"Redeploy without existing build cache"** (jeśli dostępne)

### Krok 4: Sprawdź w przeglądarce

1. Otwórz **Developer Tools** (F12)
2. Przejdź do zakładki **Console**
3. Sprawdź czy widzisz błędy związane z Supabase
4. Przejdź do zakładki **Network**
5. Spróbuj zarejestrować konto ponownie
6. Sprawdź czy są requesty do Supabase (powinny być widoczne jako `https://xxxxx.supabase.co/...`)

## Diagnostyka:

### Sprawdź czy zmienne są dostępne w przeglądarce:

1. Otwórz **Developer Tools** (F12)
2. W **Console** wpisz:
   ```javascript
   console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
   console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20));
   ```
3. Jeśli widzisz `undefined` - zmienne nie są ustawione

### Sprawdź czy Supabase URL jest poprawny:

1. Skopiuj `NEXT_PUBLIC_SUPABASE_URL` z Vercel
2. Otwórz w przeglądarce (powinien pokazać stronę Supabase)
3. Jeśli nie działa - URL jest nieprawidłowy

## Częste błędy:

### ❌ Błąd 1: Puste wartości
```
NEXT_PUBLIC_SUPABASE_URL = 
NEXT_PUBLIC_SUPABASE_ANON_KEY = 
```
**Rozwiązanie:** Upewnij się, że wartości są wypełnione

### ❌ Błąd 2: Cudzysłowy wokół wartości
```
NEXT_PUBLIC_SUPABASE_URL = "https://xxxxx.supabase.co"
```
**Rozwiązanie:** Usuń cudzysłowy - Vercel dodaje je automatycznie

### ❌ Błąd 3: Spacje na początku/końcu
```
NEXT_PUBLIC_SUPABASE_URL =  https://xxxxx.supabase.co 
```
**Rozwiązanie:** Usuń spacje

### ❌ Błąd 4: Zmienne tylko dla Production
**Rozwiązanie:** Zaznacz wszystkie środowiska (Production, Preview, Development)

## Po naprawie:

Po dodaniu zmiennych i redeploy:
1. ✅ Aplikacja powinna połączyć się z Supabase
2. ✅ Rejestracja powinna działać
3. ✅ Login powinien działać

## Jeśli nadal nie działa:

1. Sprawdź logi w Vercel Dashboard → Deployments → Runtime Logs
2. Sprawdź czy Supabase projekt jest aktywny
3. Sprawdź czy RLS (Row Level Security) nie blokuje operacji
4. Sprawdź czy email confirmation nie jest wymagany w Supabase Auth settings

