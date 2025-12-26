# Fix dla problemu OOM (Out of Memory) w Vercel

## Problem:
Logi urywają się podczas `npm install` - to klasyczny przypadek **Out of Memory (OOM)**.

## Przyczyna:
1. Vercel używa `npm install` zamiast `npm ci` (pomimo `vercel.json`)
2. `npm install` zużywa więcej pamięci niż `npm ci`
3. `node_modules` ma 508MB - może być za dużo dla darmowego planu

## Rozwiązanie:

### Krok 1: Ustaw Install Command w Vercel Dashboard

**WAŻNE:** Vercel może ignorować `vercel.json` jeśli ustawienia są w Dashboard!

1. **Vercel Dashboard** → Twój projekt → **Settings** → **General**
2. Znajdź sekcję **"Build & Development Settings"**
3. W polu **"Install Command"** wpisz:
   ```
   npm ci
   ```
4. **Zapisz** zmiany

### Krok 2: Ustaw Node.js Version

1. W tym samym miejscu (Settings → General)
2. **Node.js Version** → wybierz **20.x** (lub minimum 18.x)
3. **Zapisz**

### Krok 3: Sprawdź czy nie ma duplikacji

Jeśli w Dashboard masz ustawione:
- Install Command: `npm install` 
- A w `vercel.json` masz: `npm ci`

**Dashboard ma priorytet!** Usuń z Dashboard lub zmień na `npm ci`.

### Krok 4: Redeploy

Po zmianach:
- **Deployments** → **Redeploy** (lub push nowy commit)

## Dlaczego `npm ci` jest lepsze?

- ✅ **Szybsze** - nie sprawdza wszystkich wersji
- ✅ **Mniej pamięci** - używa dokładnie tego co w `package-lock.json`
- ✅ **Bardziej niezawodne** - zawsze instaluje dokładnie te same wersje
- ✅ **Lepsze dla CI/CD** - zaprojektowane dla produkcji

## Alternatywne rozwiązanie (jeśli nadal OOM):

Jeśli `npm ci` nadal powoduje OOM:

1. **Zoptymalizuj zależności:**
   - Usuń nieużywane pakiety
   - Sprawdź czy wszystkie są potrzebne

2. **Rozważ upgrade do Vercel Pro:**
   - Więcej pamięci RAM
   - Szybsze buildy

3. **Użyj `.npmrc`:**
   ```ini
   prefer-offline=true
   cache-max=86400000
   ```

## Status:
- ✅ `vercel.json` zaktualizowany (usunięto `--legacy-peer-deps`)
- ⚠️ **WAŻNE:** Ustaw `npm ci` w Vercel Dashboard!
- ⚠️ **WAŻNE:** Ustaw Node.js 20 w Vercel Dashboard!

