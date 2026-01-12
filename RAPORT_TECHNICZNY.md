# Raport Techniczny - Projekt Staffer

## 1. Drzewo Plików (bez node_modules)

```
Staffer/
├── app/
│   ├── [lang]/                    # Routing z internacjonalizacją
│   │   ├── (company)/             # Portal firmowy (route group)
│   │   │   ├── company-setup/
│   │   │   ├── create-shift/
│   │   │   ├── dashboard/
│   │   │   ├── locations/
│   │   │   ├── shifts/
│   │   │   └── timesheets/
│   │   ├── applications/          # Zarządzanie aplikacjami
│   │   ├── candidates/            # Zarządzanie kandydatami
│   │   ├── company/
│   │   ├── finances/              # Finanse i payroll
│   │   ├── login/                 # Logowanie
│   │   ├── onboarding/           # Proces onboardingu
│   │   ├── profile/               # Profil użytkownika
│   │   ├── register/              # Rejestracja
│   │   ├── schedule/              # Kalendarz zmian
│   │   ├── timesheets/            # Karty czasu pracy
│   │   ├── dictionaries.ts        # Konfiguracja tłumaczeń
│   │   ├── layout.tsx             # Główny layout
│   │   └── page.tsx               # Strona główna
│   ├── actions/                   # Server Actions (Next.js)
│   │   ├── applications.ts
│   │   ├── reviews.ts
│   │   ├── shifts.ts
│   │   └── timesheets.ts
│   └── globals.css                # Globalne style CSS
│
├── components/
│   ├── auth/                      # Komponenty autentykacji
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── company/                   # Komponenty portalu firmowego
│   │   ├── CandidateProfileModal.tsx
│   │   └── ShiftDetailModal.tsx
│   ├── dashboard/                 # Komponenty dashboardu
│   │   ├── ArchivedShiftsList.tsx
│   │   ├── ShiftsTabs.tsx
│   │   └── StatsCards.tsx
│   ├── profile/                  # Komponenty profilu
│   │   ├── CompanyProfileForm.tsx
│   │   └── WorkerProfileForm.tsx
│   ├── ui/                        # Komponenty UI (Shadcn)
│   │   ├── accordion.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── sheet.tsx
│   │   ├── skeleton.tsx
│   │   ├── table.tsx
│   │   └── textarea.tsx
│   ├── verification/              # Komponenty weryfikacji
│   │   └── VerificationWizard.tsx
│   ├── worker/                    # Komponenty portalu pracownika
│   │   ├── ApplyModal.tsx
│   │   ├── DayShiftList.tsx
│   │   └── ScheduleCalendar.tsx
│   ├── CompanyProfileDialog.tsx
│   ├── CreateLocationModal.tsx
│   ├── ImageCropperModal.tsx
│   ├── JobCard.tsx
│   ├── JobDetailsDialog.tsx
│   ├── LanguageSwitcher.tsx
│   ├── Navbar.tsx
│   ├── RateWorkerDialog.tsx
│   └── WorkerReviewsDialog.tsx
│
├── dictionaries/                  # Pliki tłumaczeń
│   ├── da.json                    # Duński
│   └── en.json                    # Angielski
│
├── lib/                           # Biblioteki pomocnicze
│   ├── auth.ts                    # Funkcje autentykacji
│   ├── canvasUtils.ts             # Narzędzia do pracy z canvas
│   ├── date-utils.ts              # Narzędzia do dat
│   └── utils.ts                   # Funkcje pomocnicze (Shadcn)
│
├── supabase/
│   └── edge-functions/            # Supabase Edge Functions
│       ├── decrypt-cpr/
│       │   └── index.ts
│       └── encrypt-cpr/
│           └── index.ts
│
├── types/
│   └── database.ts                # Typy TypeScript dla bazy danych
│
├── utils/
│   └── supabase/                  # Konfiguracja klientów Supabase
│       ├── client.ts              # Klient przeglądarkowy
│       ├── middleware.ts          # Middleware dla SSR
│       └── server.ts              # Klient serwerowy
│
├── components.json                # Konfiguracja Shadcn UI
├── DATABASE_SCHEMA.md             # Dokumentacja schematu bazy
├── middleware.ts                  # Next.js middleware (i18n + auth)
├── next.config.ts                 # Konfiguracja Next.js
├── package.json                   # Zależności projektu
├── postcss.config.mjs             # Konfiguracja PostCSS
├── README.md                      # Dokumentacja projektu
├── recreate_database_schema.sql   # SQL do odtworzenia schematu
├── RPC_CALLS_DOCUMENTATION.md     # Dokumentacja wywołań RPC
├── tailwind.config.ts             # Konfiguracja Tailwind CSS
├── TIMESHEET_AUDIT_REPORT.md      # Raport audytu timesheetów
├── tsconfig.json                  # Konfiguracja TypeScript
└── vercel.json                    # Konfiguracja Vercel
```

## 2. Zawartość package.json (Zależności)

### Dependencies (Produkcyjne):
- **Next.js 15.0.0** - Framework React z App Router
- **React 19.0.0** - Biblioteka UI
- **React DOM 19.0.0** - Renderowanie React
- **TypeScript 5.3.3** - Język programowania
- **Supabase:**
  - `@supabase/ssr@0.8.0` - Supabase dla Server-Side Rendering
  - `@supabase/supabase-js@2.89.0` - Klient JavaScript Supabase
- **Internacjonalizacja:**
  - `next-intl@4.6.1` - Internacjonalizacja dla Next.js
  - `@formatjs/intl-localematcher@0.7.3` - Dopasowanie locale
  - `negotiator@1.0.0` - Negocjacja języka
- **UI Framework (Shadcn/Radix UI):**
  - `@radix-ui/react-avatar@1.1.11`
  - `@radix-ui/react-dialog@1.1.15`
  - `@radix-ui/react-dropdown-menu@2.0.6`
  - `@radix-ui/react-label@2.1.8`
  - `@radix-ui/react-select@2.2.6`
  - `@radix-ui/react-slot@1.2.4`
- **Styling:**
  - `tailwindcss@3.4.1` - Framework CSS utility-first
  - `tailwindcss-animate@1.0.7` - Animacje Tailwind
  - `tailwind-merge@2.2.0` - Merge klas Tailwind
  - `class-variance-authority@0.7.0` - Zarządzanie wariantami klas
  - `clsx@2.1.0` - Warunkowe klasy CSS
- **Narzędzia:**
  - `lucide-react@0.400.0` - Ikony
  - `date-fns@3.0.0` - Obsługa dat
  - `date-fns-tz@3.2.0` - Obsługa stref czasowych
  - `zod@3.25.76` - Walidacja schematów
  - `react-easy-crop@5.5.6` - Przycinanie obrazów
  - `react-webcam@7.2.0` - Obsługa kamery

### DevDependencies:
- `@types/node@20.11.0` - Typy TypeScript dla Node.js
- `@types/react@18.2.48` - Typy TypeScript dla React
- `@types/react-dom@18.2.18` - Typy TypeScript dla React DOM
- `eslint@8.56.0` - Linter
- `eslint-config-next@15.0.0` - Konfiguracja ESLint dla Next.js
- `autoprefixer@10.4.17` - Autoprefixer CSS
- `postcss@8.4.33` - PostCSS

### Wymagania:
- **Node.js:** >= 18.0.0

## 3. Opis Kluczowych Folderów

### `/app` - Next.js App Router
Główny folder aplikacji wykorzystujący Next.js 15 App Router:
- **`[lang]`** - Dynamiczny routing z internacjonalizacją (en-US, da)
- **`(company)`** - Route group dla portalu firmowego (niewidoczny w URL)
- **`actions/`** - Server Actions do operacji serwerowych (aplikacje, zmiany, timesheety, recenzje)
- **`globals.css`** - Globalne style z zmiennymi CSS dla Shadcn UI

### `/components` - Komponenty React
Struktura komponentów podzielona na kategorie:
- **`auth/`** - Formularze logowania i rejestracji
- **`company/`** - Komponenty specyficzne dla portalu firmowego
- **`worker/`** - Komponenty portalu pracownika
- **`ui/`** - Komponenty UI z Shadcn (accordion, button, card, dialog, etc.)
- **`dashboard/`** - Komponenty dashboardu
- **`profile/`** - Formularze profilu użytkownika
- **`verification/`** - Komponenty weryfikacji użytkowników

### `/lib` - Biblioteki pomocnicze
- **`auth.ts`** - Funkcje autentykacji
- **`canvasUtils.ts`** - Narzędzia do pracy z canvas (prawdopodobnie do przetwarzania obrazów)
- **`date-utils.ts`** - Funkcje pomocnicze do obsługi dat
- **`utils.ts`** - Funkcje pomocnicze Shadcn (cn, merge classes)

### `/utils/supabase` - Konfiguracja Supabase
- **`client.ts`** - Klient Supabase dla przeglądarki
- **`middleware.ts`** - Middleware do aktualizacji sesji Supabase w SSR
- **`server.ts`** - Klient Supabase dla serwera

### `/supabase/edge-functions` - Supabase Edge Functions
Funkcje uruchamiane na krawędzi Supabase:
- **`encrypt-cpr/`** - Szyfrowanie numerów CPR (duńskie numery identyfikacyjne)
- **`decrypt-cpr/`** - Odszyfrowywanie numerów CPR

### `/types` - Definicje typów TypeScript
- **`database.ts`** - Typy generowane z schematu bazy danych Supabase

### `/dictionaries` - Pliki tłumaczeń
- **`en.json`** - Tłumaczenia angielskie
- **`da.json`** - Tłumaczenia duńskie

## 4. Główne Technologie

### Framework i Runtime:
- **Next.js 15** - Framework React z App Router, Server Components, Server Actions
- **React 19** - Najnowsza wersja React
- **TypeScript** - Język programowania z strict mode

### Backend i Baza Danych:
- **Supabase** - Backend-as-a-Service:
  - PostgreSQL (baza danych)
  - Authentication (autentykacja użytkowników)
  - Row Level Security (RLS) - bezpieczeństwo na poziomie wierszy
  - Edge Functions (funkcje serwerowe)
  - Storage (przechowywanie plików)

### UI Framework i Styling:
- **Shadcn UI** - Komponenty UI oparte na Radix UI
- **Radix UI** - Primitives dla komponentów dostępnych (dialog, dropdown, select, etc.)
- **Tailwind CSS** - Framework CSS utility-first
- **CSS Variables** - Dynamiczne zmienne CSS dla themingu
- **Lucide React** - Biblioteka ikon

### State Management:
- **Server Components** - Domyślne komponenty serwerowe Next.js
- **Server Actions** - Funkcje serwerowe w Next.js (zamiast API routes)
- **React Hooks** - useState, useEffect, etc. dla stanu klienckiego
- **Brak dedykowanego state management** - Projekt wykorzystuje głównie Server Components i Server Actions

### Walidacja:
- **Zod** - Walidacja schematów TypeScript-first

### Internacjonalizacja:
- **next-intl** - Biblioteka i18n dla Next.js
- **FormatJS** - Narzędzia do formatowania międzynarodowego
- **Wsparcie dla:** angielskiego (en-US) i duńskiego (da)

### Narzędzia do Dat:
- **date-fns** - Biblioteka do obsługi dat
- **date-fns-tz** - Obsługa stref czasowych

### Inne:
- **react-easy-crop** - Przycinanie obrazów (prawdopodobnie do zdjęć profilowych)
- **react-webcam** - Obsługa kamery (prawdopodobnie do weryfikacji tożsamości)

### Deployment:
- **Vercel** - Platforma deployment (konfiguracja w `vercel.json`)

### Architektura:
- **App Router** - Nowy routing Next.js 15
- **Server-Side Rendering (SSR)** - Renderowanie po stronie serwera
- **Server Components** - Komponenty domyślnie renderowane na serwerze
- **Client Components** - Komponenty z "use client" dla interaktywności
- **Middleware** - Middleware dla i18n i autentykacji

## 5. Charakterystyka Projektu

### Typ Aplikacji:
Platforma B2B do zarządzania pracownikami tymczasowymi (staffing platform) dla rynku duńskiego.

### Główne Funkcjonalności:
1. **Portal Firmowy:**
   - Tworzenie i zarządzanie zmianami
   - Zarządzanie kandydatami i aplikacjami
   - Zarządzanie lokalizacjami
   - Zatwierdzanie czasów pracy (timesheets)
   - Finanse i payroll

2. **Portal Pracownika:**
   - Przeglądanie ofert pracy (job board)
   - Aplikowanie na zmiany
   - Kalendarz zmian
   - Zarządzanie profilem
   - Karty czasu pracy

3. **Bezpieczeństwo:**
   - Szyfrowanie numerów CPR (duńskie numery identyfikacyjne)
   - Row Level Security w Supabase
   - Role-based access control

### Specyfika Rynku Duńskiego:
- Obsługa numerów CPR (szyfrowanie/deszyfrowanie)
- Eksport payroll zgodny z Danløn/Dataløn
- Dwujęzyczność (duński/angielski)

---

**Wersja projektu:** 0.1.0  
**Nazwa projektu:** vikar-system
