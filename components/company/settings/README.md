# Company Settings Components

Modularny panel ustawień firmy z podziałem na dedykowane komponenty.

## Struktura

```
components/company/settings/
├── CompanySettingsClient.tsx   - Główny komponent z Tabs (Client)
├── FinancialInfoForm.tsx       - Informacje finansowe firmy
├── BillingSettings.tsx         - Ustawienia płatności (placeholder)
├── NotificationSettings.tsx    - Ustawienia notyfikacji (JSONB)
├── SecuritySettings.tsx        - Zmiana hasła
├── LegalSection.tsx            - Warunki prawne
└── README.md                   - Ta dokumentacja
```

## Komponenty

### 1. FinancialInfoForm
**Ścieżka:** `components/company/settings/FinancialInfoForm.tsx`

Formularz informacji finansowych z walidacją Zod i react-hook-form.

**Pola:**
- Company Name (read-only) - nazwa z bazy
- CVR/VAT Number * (wymagane)
- Invoice Email (opcjonalne, validacja email)
- Main Address (opcjonalne)
- EAN Number (opcjonalne)

**Props:**
- `userId: string` - ID użytkownika (profile_id)

**Technologie:**
- react-hook-form + @hookform/resolvers/zod
- Supabase client-side
- shadcn/ui components

### 2. BillingSettings
**Ścieżka:** `components/company/settings/BillingSettings.tsx`

Placeholder UI dla metod płatności (karty NIE są zapisywane w bazie).

**Funkcje:**
- Wyświetla "No payment method added" lub mock "**** 4242"
- Przycisk "Add Card" / "Update"
- Sekcja "Billing History" (placeholder)

**Props:** Brak (statyczny komponent)

### 3. NotificationSettings
**Ścieżka:** `components/company/settings/NotificationSettings.tsx`

Zarządzanie preferencjami notyfikacji zapisywanymi w kolumnie JSONB `notification_settings`.

**Struktura danych (JSONB):**
```json
{
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
}
```

**Grupy przełączników:**

A. **Channels** (Kanały):
   - Email Notifications
   - SMS Notifications

B. **Notification Types** (Typy):
   - Newsletter
   - New Worker Applied
   - Offer Accepted by Worker
   - Pending Workdays to Approve
   - Pick Applicants
   - Rate Worker

**Props:**
- `userId: string` - ID użytkownika

### 4. SecuritySettings
**Ścieżka:** `components/company/settings/SecuritySettings.tsx`

Formularz zmiany hasła z walidacją.

**Pola:**
- Current Password *
- New Password * (z PasswordRequirements)
- Confirm New Password *

**Walidacja:**
- Min. 8 znaków
- 1 wielka litera, 1 mała, 1 cyfra, 1 znak specjalny
- Nowe hasło musi być różne od obecnego
- Potwierdzenie musi się zgadzać

**Props:**
- `userEmail: string` - Email użytkownika (do weryfikacji)
- `lang: string` - Język dla PasswordRequirements

### 5. LegalSection
**Ścieżka:** `components/company/settings/LegalSection.tsx`

Statyczna sekcja z linkami do dokumentów prawnych (placeholdery).

**Linki:**
- Terms of Service
- Privacy Policy
- Cookie Policy

**Props:** Brak

## Strona ustawień

**Ścieżka:** `app/[lang]/(company)/settings/page.tsx`

Server Component który:
1. Weryfikuje autentykację użytkownika
2. Sprawdza czy user.role === 'company'
3. Renderuje `CompanySettingsClient` z danymi użytkownika

**Client Component:** `components/company/settings/CompanySettingsClient.tsx`

**Layout z Zakładkami (Tabs):**

```
┌─────────────────────────────────────────┐
│  Settings                                │
│  Manage your account settings...         │
├─────────────────────────────────────────┤
│ [Company Details] [Billing] [Notifications] [Security] [Legal] │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐  │
│  │   Card z formularzem             │  │
│  │   (zawartość aktywnej zakładki)  │  │
│  └──────────────────────────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

**Zakładki:**
1. **Company Details** - FinancialInfoForm
2. **Billing** - BillingSettings  
3. **Notifications** - NotificationSettings
4. **Security** - SecuritySettings (Change Password)
5. **Legal** - LegalSection

## Baza danych

### Migracja: `012_add_company_settings_columns.sql`

Dodaje kolumny do tabeli `company_details`:
- `invoice_email` (TEXT)
- `notification_settings` (JSONB) - z domyślnymi wartościami
- `description` (TEXT)

### Migracja: `013_update_upsert_company_secure.sql`

Aktualizuje funkcję RPC `upsert_company_secure()` aby obsługiwała:
- p_invoice_email
- p_description
- oraz wszystkie pozostałe pola

## Instalacja

### 1. Zainstaluj zależności
```bash
npm install react-hook-form @hookform/resolvers
```

### 2. Uruchom migracje (Supabase)
```bash
npx supabase db push
# lub zastosuj ręcznie:
# - 012_add_company_settings_columns.sql
# - 013_update_upsert_company_secure.sql
```

### 3. Dodaj link w nawigacji
```tsx
<Link href={`/${lang}/settings`}>Settings</Link>
```

## Użycie

Strona jest dostępna pod: `/{lang}/settings` (tylko dla company role).

Przykład: `https://yourapp.com/en/settings`

## Spójność wizualna

Panel jest zbudowany w stylu identycznym do `WorkerSettingsClient.tsx`:
- Karty (Card) z CardHeader i CardContent
- Sekcje z Label i opisami
- Przyciski "Save Changes" w prawym dolnym rogu
- Komunikaty sukcesu/błędu w green-50/red-50
- Przełączniki Switch w border rounded-lg

## TypeScript

Wszystkie komponenty są w pełni typowane z:
- Strict mode
- Zod schemas dla walidacji
- Typy dla JSONB notification_settings
- Props interfaces

## Bezpieczeństwo

- RLS (Row Level Security) na company_details
- Server-side weryfikacja roli
- Funkcja RPC z SECURITY DEFINER
- Walidacja hasła po stronie klienta i serwera
- Email validation w Zod schema
