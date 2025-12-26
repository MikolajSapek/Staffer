# Debug Vercel Build - Instrukcje

## Problem: Build urywa się podczas npm install

### Rozwiązanie 1: Sprawdź pełne logi

1. W Vercel Dashboard → Deployments → [twój failed deployment]
2. Kliknij "Build Logs"
3. **Przewiń do samego końca** (najważniejsze błędy są na dole)
4. Skopiuj **ostatnie 50-100 linii** logów
5. Wklej tutaj lub sprawdź czy widzisz:
   - `Error:`
   - `Type Error`
   - `Command failed`
   - `SIGKILL`
   - `Out of memory`

### Rozwiązanie 2: Sprawdź wersję Node.js w Vercel

1. Vercel Dashboard → Settings → General
2. Sprawdź "Node.js Version"
3. **Ustaw na 20.x** (lub 18.x minimum)
4. Jeśli było ustawione na starszą wersję, zmień i redeploy

### Rozwiązanie 3: Zoptymalizuj instalację

Dodano `.nvmrc` i zmieniono `installCommand` na `npm ci` (szybsze i bardziej niezawodne niż `npm install`).

### Rozwiązanie 4: Jeśli problem z pamięcią (OOM)

Jeśli widzisz `SIGKILL` lub `Out of memory`:

1. **Lokalnie:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   git add package-lock.json
   git commit -m "Regenerate package-lock.json"
   git push
   ```

2. **W Vercel:**
   - Sprawdź czy używasz darmowego planu (limit pamięci)
   - Rozważ upgrade do Pro (więcej pamięci)

### Rozwiązanie 5: Tymczasowe uproszczenie

Jeśli nadal nie działa, możesz spróbować:

1. Usunąć `--legacy-peer-deps` z `vercel.json`
2. Upewnić się, że wszystkie zależności są kompatybilne

## Co zostało zrobione:

✅ Dodano `.nvmrc` (wymusza Node.js 20)
✅ Zmieniono `installCommand` na `npm ci` (szybsze)
✅ Zaktualizowano `vercel.json`

## Następne kroki:

1. **Sprawdź pełne logi** z Vercel (ostatnie 50-100 linii)
2. **Ustaw Node.js 20** w Vercel Settings
3. **Redeploy** po zmianach
4. **Jeśli nadal błąd**, wklej tutaj końcówkę logów

