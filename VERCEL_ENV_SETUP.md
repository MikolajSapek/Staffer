# Konfiguracja zmiennych środowiskowych w Vercel

## Problem
Błąd: `Environment Variable "NEXT_PUBLIC_SUPABASE_URL" references Secret "supabase_url", which does not exist.`

## Rozwiązanie

Usunięto referencje do secretów z `vercel.json`. Zmienne środowiskowe należy dodać bezpośrednio w panelu Vercel.

## Jak dodać zmienne środowiskowe w Vercel:

### Metoda 1: Przez Dashboard Vercel (Zalecane)

1. **Przejdź do swojego projektu w Vercel Dashboard**
   - https://vercel.com/dashboard
   - Wybierz projekt "Staffer"

2. **Otwórz Settings → Environment Variables**

3. **Dodaj następujące zmienne:**

   **Dla Production, Preview i Development:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=twoj_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj_supabase_anon_key
   ```

   **Opcjonalnie (jeśli używasz):**
   ```
   SUPABASE_SERVICE_ROLE_KEY=twoj_service_role_key
   CPR_ENCRYPTION_KEY=twoj_32_byte_hex_key
   STRIPE_SECRET_KEY=twoj_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=twoj_stripe_publishable_key
   ```

4. **Kliknij "Save"**

5. **Redeploy aplikację:**
   - Przejdź do "Deployments"
   - Kliknij "..." przy ostatnim deployment
   - Wybierz "Redeploy"

### Metoda 2: Przez Vercel CLI

```bash
# Zainstaluj Vercel CLI (jeśli jeszcze nie masz)
npm i -g vercel

# Zaloguj się
vercel login

# Dodaj zmienne środowiskowe
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Dla preview i development też:
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add NEXT_PUBLIC_SUPABASE_URL development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development
```

## Gdzie znaleźć wartości Supabase:

1. **Przejdź do Supabase Dashboard**
   - https://supabase.com/dashboard
   - Wybierz swój projekt

2. **Settings → API**
   - `NEXT_PUBLIC_SUPABASE_URL` = "Project URL"
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = "anon public" key
   - `SUPABASE_SERVICE_ROLE_KEY` = "service_role" key (⚠️ NIE używaj w kodzie klienckim!)

## Ważne uwagi:

- ✅ Zmienne z prefiksem `NEXT_PUBLIC_` są dostępne w przeglądarce
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` NIGDY nie powinien być w kodzie klienckim
- 🔄 Po dodaniu zmiennych, **zawsze redeploy** aplikację
- 📝 Możesz dodać różne wartości dla Production, Preview i Development

## Weryfikacja:

Po redeploy, sprawdź czy aplikacja działa:
- Otwórz URL swojego projektu na Vercel
- Sprawdź logi w Vercel Dashboard → Deployments → [twój deployment] → Runtime Logs

## Troubleshooting:

**Jeśli nadal masz błędy:**
1. Sprawdź czy wszystkie zmienne są dodane dla odpowiedniego środowiska (Production/Preview/Development)
2. Upewnij się, że wartości są poprawne (bez cudzysłowów, bez spacji)
3. Sprawdź logi build w Vercel Dashboard
4. Upewnij się, że wykonałeś redeploy po dodaniu zmiennych

