# Weryfikacja po optymalizacji RLS (RLS Init Plan)

Aplikacja używa **wyłącznie roli `authenticated`** (klucz anon + JWT użytkownika). Nie używamy `service_role` ani `anon` do zapytań biznesowych.

## Raportowanie błędu 403

Jeśli zapytanie zwraca **403** (lub błąd polityki RLS), w konsoli (serwer lub przeglądarka) pojawi się log z prefiksem:

- `[CompanyProfile] company_details SELECT error` → tabela **company_details**, akcja **SELECT**
- `[CompanyProfile] upsert_company_secure RPC error` → RPC zapisuje do **company_details** (**INSERT** lub **UPDATE**)
- `[Market] Shifts/company_details RLS/query error` → **shifts** lub **company_details** (join), akcja **SELECT**
- `[JobDetailsDialog] shift_requirements SELECT error` → tabela **shift_requirements**, akcja **SELECT**
- `[WorkerProfile] documents INSERT error` → tabela **documents**, akcja **INSERT**
- `[worker_skills] Delete error` / `[worker_skills] Insert error` → tabela **worker_skills**, akcja **DELETE** / **INSERT**

Podaj w raporcie: **tabela** + **akcja (SELECT/INSERT/UPDATE/DELETE)** + `error.code` i `error.message` z logu.

---

## Co sprawdzić po zmianach polityk

### 1. Profil firmy (CompanyProfileForm)

- **Zapis:** przez RPC `upsert_company_secure` (wewnętrznie INSERT/UPDATE na **company_details**). Nowa polityka `cd_manage_owner` powinna zezwalać na zapis gdy `profile_id = auth.uid()`.
- **Odczyt:** SELECT z **company_details** WHERE `profile_id = authUser.id` (ładowanie i odświeżenie po zapisie). Przy błędzie: `[CompanyProfile] company_details SELECT error`.

### 2. Dashboard firmy (`/[lang]/dashboard`)

- **shifts**: `company_id = auth.uid()` – firma widzi tylko swoje zmiany.
- **locations**: join przez `shifts_location_id_fkey`.
- **shift_applications**, **profiles**, **worker_details**: join przez `worker_id` / `profile_id`; worker_details po `worker_details_profile_id_fkey(avatar_url)`.

Jeśli zapytania zwracają błąd (np. 403), w konsoli serwera pojawi się:  
`[Dashboard] Active shifts RLS/query error:` (lub Past/Status shifts).

### 3. Rynek pracy – Worker Market (`/[lang]/market`)

- **shifts**: `status = 'published'`, `start_time > now()`; w select są **locations** (`locations!location_id (name, address)`) oraz **requirements** (kolumna JSONB na `shifts`).
- **company_details**: join `profiles!company_id` → `company_details!profile_id (company_name, logo_url)`.
- **Wymagania (szczegóły):** w `JobDetailsDialog` przy otwarciu oferty wykonywany jest SELECT z **shift_requirements** (join do `skills`). Przy błędzie: `[JobDetailsDialog] shift_requirements SELECT error`.

Jeśli RLS blokuje odczyt shifts/locations/company_details, w konsoli:  
`[Market] Shifts/company_details RLS/query error:`  
W UI użytkownik zobaczy komunikat o niemożności załadowania ofert.

### 4. Pracownik: dokumenty i historia kar (strikes)

- **Dokumenty:** worker widzi je w profilu – lista pochodzi z RPC `get_worker_full_profile` (w RPC: SELECT z **documents** WHERE `worker_id = p_worker_id`). RPC jest SECURITY DEFINER, więc odczyt w RPC może omijać RLS. Dodanie dokumentu (ID card) w profilu to **documents INSERT** z `worker_id: user.id` – przy błędzie: `[WorkerProfile] documents INSERT error`. Polityka na **documents** powinna zezwalać: SELECT/INSERT gdzie `worker_id = auth.uid()`.
- **Historia kar (strikes):** tabela **strike_history** w bazie istnieje, ale w aplikacji nie ma obecnie widoku „historia kar” dla workera (ani w RPC, ani w UI). Jeśli chcesz, żeby worker widział swoje strikes, dodaj SELECT z **strike_history** WHERE `worker_id = auth.uid()` (np. w RPC lub osobnym zapytaniu) i sekcję w profilu.

### 5. Tabela `worker_skills`

- **DELETE**: `worker_id = auth.uid()` – worker może usuwać tylko swoje wpisy.
- **INSERT**: wstawiane z `worker_id: user.id` (auth.uid()) – worker może dodawać tylko swoje umiejętności.

W profilu workera (zapisywanie umiejętności): przy błędzie uprawnień (np. 42501 / policy / permission) w konsoli:  
`[worker_skills] Delete error:` lub `[worker_skills] Insert error:`  
W formularzu wyświetli się komunikat o braku uprawnień (z hintem RLS).

### 6. Zapytania zwracające 403

- Sprawdź, czy w kodzie **nigdzie** nie tworzysz klienta Supabase z `service_role` ani z rolami innymi niż kontekst użytkownika (anon + JWT).
- Serwer: `utils/supabase/server.ts` – `createClient()` używa `NEXT_PUBLIC_SUPABASE_ANON_KEY` i ciasteczek sesji (authenticated).
- Klient: `utils/supabase/client.ts` – `createBrowserClient` z anon key (authenticated po zalogowaniu).

## Szybki test po wdrożeniu

1. **Profil firmy:** Zaloguj się jako firma → Ustawienia/Profil firmy → zmień dane i zapisz. Brak 403; przy błędzie: `[CompanyProfile] company_details SELECT` lub `upsert_company_secure RPC` w konsoli.
2. **Dashboard firmy:** Lista aktywnych i archiwalnych shiftów, brak pustego ekranu i błędów w konsoli.
3. **Rynek pracy (worker):** Lista ofert z **lokalizacjami** (name, address) i **wymaganiami** (kolumna `requirements` + w szczegółach oferty `shift_requirements`). Przy błędzie: `[Market]` lub `[JobDetailsDialog] shift_requirements` w konsoli.
4. **Profil workera:** Widoczna lista **dokumentów** (z RPC); dodanie ID card = INSERT do **documents**. Przy błędzie: `[WorkerProfile] documents INSERT`. Historia kar (strikes) nie jest obecnie wyświetlana w UI.
5. **Umiejętności workera:** Zmiana zestawu i zapis (worker_skills DELETE + INSERT). Przy błędzie: log `[worker_skills]` + komunikat w formularzu.
