# Szybka kopia - Co wkleić w Vercel

## Krok 1: Otwórz Supabase Dashboard
https://supabase.com/dashboard → Twój projekt → Settings → API

## Krok 2: Skopiuj wartości

### Zmienna 1:
**Key:** `NEXT_PUBLIC_SUPABASE_URL`
**Value:** Skopiuj z pola "Project URL" (np. `https://xxxxx.supabase.co`)

### Zmienna 2:
**Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Value:** Skopiuj z pola "anon public" (długi klucz zaczynający się od `eyJ...`)

## Krok 3: Wklej w Vercel

W Vercel Dashboard → Settings → Environment Variables:

1. **Kliknij "Add Another"**
2. **Key:** `NEXT_PUBLIC_SUPABASE_URL`
3. **Value:** Wklej URL z Supabase
4. **Environments:** Zaznacz wszystkie (Production, Preview, Development)
5. **Save**

Powtórz dla drugiej zmiennej.

## Krok 4: Redeploy
Deployments → Redeploy

---

## Przykład (nie kopiuj tych wartości - użyj swoich!):

```
NEXT_PUBLIC_SUPABASE_URL = https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTcyOTgwMCwiZXhwIjoxOTYxMzA1ODAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

