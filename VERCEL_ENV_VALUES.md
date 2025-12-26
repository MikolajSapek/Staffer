# Co wkleić w Vercel Environment Variables

## Wymagane zmienne środowiskowe

W Vercel Dashboard → Settings → Environment Variables dodaj następujące zmienne:

### 1. NEXT_PUBLIC_SUPABASE_URL

**Key:**
```
NEXT_PUBLIC_SUPABASE_URL
```

**Value:**
```
https://twoj-projekt-id.supabase.co
```
*(Zastąp `twoj-projekt-id` rzeczywistym ID Twojego projektu Supabase)*

**Gdzie znaleźć:**
- Supabase Dashboard → Settings → API → "Project URL"

---

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY

**Key:**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3b2otcHJvamVrdC1pZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ1NzI5ODAwLCJleHAiOjE5NjEzMDU4MDB9.twoj-klucz-tutaj
```
*(To jest przykład - wklej swój rzeczywisty anon key)*

**Gdzie znaleźć:**
- Supabase Dashboard → Settings → API → "anon public" key

---

## Jak dodać w Vercel:

1. **Przejdź do:** Vercel Dashboard → Twój projekt → Settings → Environment Variables

2. **Dla każdej zmiennej:**
   - Kliknij "Add Another"
   - W polu **Key** wpisz nazwę (np. `NEXT_PUBLIC_SUPABASE_URL`)
   - W polu **Value** wklej wartość z Supabase
   - Zaznacz **All Environments** (Production, Preview, Development)
   - Kliknij "Save"

3. **Po dodaniu wszystkich zmiennych:**
   - Przejdź do Deployments
   - Kliknij "Redeploy" przy ostatnim deployment

---

## Przykład wypełnionego formularza:

```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://abcdefghijklmnop.supabase.co
Environments: ☑ Production ☑ Preview ☑ Development

Key: NEXT_PUBLIC_SUPABASE_ANON_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTcyOTgwMCwiZXhwIjoxOTYxMzA1ODAwfQ.example-key-here
Environments: ☑ Production ☑ Preview ☑ Development
```

---

## ⚠️ Ważne:

- **NIE** dodawaj cudzysłowów wokół wartości
- **NIE** dodawaj spacji na początku/końcu
- **TAK** - zaznacz wszystkie środowiska (Production, Preview, Development)
- Po dodaniu zmiennych **ZAWSZE** wykonaj redeploy

---

## Opcjonalne zmienne (jeśli używasz):

Jeśli planujesz używać Edge Functions lub Stripe, możesz dodać:

```
SUPABASE_SERVICE_ROLE_KEY=twoj_service_role_key
CPR_ENCRYPTION_KEY=twoj_32_byte_hex_key
STRIPE_SECRET_KEY=twoj_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=twoj_stripe_publishable_key
```

Ale na razie potrzebujesz tylko **2 wymagane zmienne** powyżej.

