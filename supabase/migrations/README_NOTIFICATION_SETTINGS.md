# Migracja: Dodanie notification_settings do company_details

## Problem
Komponent `NotificationSettings.tsx` próbował zapisywać ustawienia powiadomień do kolumny `notification_settings` w tabeli `company_details`, ale ta kolumna nie istniała w bazie danych.

## Rozwiązanie
Dodano kolumnę JSONB `notification_settings` do tabeli `company_details`.

## Jak uruchomić migrację w Supabase

### Opcja 1: Przez Dashboard Supabase (ZALECANE)

1. Zaloguj się do **Supabase Dashboard**
2. Przejdź do **SQL Editor**
3. Otwórz plik: `supabase/migrations/add_notification_settings_to_company_details.sql`
4. Skopiuj całą zawartość pliku
5. Wklej do SQL Editor w Supabase
6. Kliknij **Run** (lub Ctrl+Enter)
7. Sprawdź czy migracja wykonała się bez błędów

### Opcja 2: Przez CLI Supabase

```bash
# Jeśli masz skonfigurowane Supabase CLI
supabase db push
```

### Opcja 3: Manualne SQL (jeśli migracja nie zadziała)

```sql
-- Dodaj kolumnę
ALTER TABLE public.company_details 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "channels": {
    "email": true,
    "sms": false
  },
  "types": {
    "newsletter": false,
    "new_worker_applied": true,
    "offer_accepted": true,
    "pending_workdays": true,
    "pick_candidates": true,
    "rate_worker": true
  }
}'::jsonb;

-- Zaktualizuj istniejące rekordy
UPDATE public.company_details
SET notification_settings = '{
  "channels": {
    "email": true,
    "sms": false
  },
  "types": {
    "newsletter": false,
    "new_worker_applied": true,
    "offer_accepted": true,
    "pending_workdays": true,
    "pick_candidates": true,
    "rate_worker": true
  }
}'::jsonb
WHERE notification_settings IS NULL;
```

## Weryfikacja

Po uruchomieniu migracji, sprawdź czy kolumna została dodana:

```sql
-- Sprawdź strukturę tabeli
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'company_details' 
  AND column_name = 'notification_settings';
```

Powinno zwrócić:
- `column_name`: notification_settings
- `data_type`: jsonb
- `column_default`: domyślna wartość JSON

## Testowanie

1. Zaloguj się jako użytkownik firmy (company)
2. Przejdź do **Settings → Notifications**
3. Zmień dowolny przełącznik (np. "Email Notifications", "Newsletter")
4. Kliknij **Save Changes**
5. Odśwież stronę
6. Sprawdź czy ustawienia zostały zachowane

## Zmiany w kodzie

### ✅ Zaktualizowano:
- `types/database.ts` - dodano `notification_settings: Json | null` do `company_details`

### ✅ Pozostawiono bez zmian (działa poprawnie):
- `components/company/settings/NotificationSettings.tsx`
- `components/company/settings/CompanySettingsClient.tsx`

## Struktura notification_settings (JSONB)

```typescript
{
  channels: {
    email: boolean;    // Email Notifications
    sms: boolean;      // SMS Notifications
  },
  types: {
    newsletter: boolean;           // Receive newsletters
    new_worker_applied: boolean;   // New Worker Applied
    offer_accepted: boolean;       // Offer Accepted by Worker
    pending_workdays: boolean;     // Pending Workdays to Approve
    pick_candidates: boolean;      // Pick Candidates
    rate_worker: boolean;          // Rate Worker
  }
}
```

## Domyślne wartości

- **Email**: włączone (true)
- **SMS**: wyłączone (false)
- **Newsletter**: wyłączone (false)
- **Wszystkie typy powiadomień biznesowych**: włączone (true)
