# Shift Management Platform

A comprehensive B2B staffing platform connecting companies with temporary workers in Denmark, built with modern web technologies and strict business rules.

## 1. Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** Supabase (PostgreSQL + PostGIS)
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS + Shadcn UI
- **Language:** TypeScript (Strict Mode)
- **State Management:** React Server Components + Server Actions
- **Validation:** Zod schemas
- **Edge Functions:** Deno (CPR encryption/decryption)

## 2. 🚀 Ostatnie Aktualizacje (v2.0 - Manager & Dashboard Update)

### 2.1 System Managerów (Contact Persons)
- **Nowa encja:** Dodano tabelę `managers` powiązaną z firmą (`company_id`).
- **Funkcjonalność:** Firmy mogą dodawać, edytować i usuwać managerów.
- **Integracja:** Przy tworzeniu zmiany (`CreateShift`) można przypisać konkretnego managera jako osobę kontaktową.
- **Prywatność:** Dane kontaktowe managera (telefon, email) są widoczne dla pracowników **tylko po zalogowaniu**. Dla gości są ukryte.

### 2.2 Publiczny Job Board (Guest Access)
- **Dostępność:** Oferty pracy (`shifts`), lokalizacje i profile firm są teraz widoczne dla niezalogowanych użytkowników (naprawiono RLS).
- **Bezpieczeństwo:** Frontend automatycznie ukrywa dane wrażliwe (numer telefonu managera) dla użytkowników niezalogowanych (`!user`).
- **SEO Ready:** Zmiany są publicznie dostępne pod stałymi linkami.

### 2.3 Nowy Dashboard Firmy
- **Priorytetyzacja:** Główny widok skupia się na **Active Shifts** (nadchodzące) oraz **Applicants** (kandydaci wymagający akcji).
- **Archiwum:** Historia zmian przeniesiona do osobnego widoku (`Archive Shifts`).
- **Liczniki:** Dodano powiadomienia (Badges) przy kandydatach oczekujących na akceptację (`Pending`).
- **UX:** Zmieniono układ przycisków akcji (Locations/Templates obok siebie).

### 2.4 Usprawnienia UX/UI
- **Nawigacja:** Kliknięcie w logo "Staffer" kieruje dynamicznie: Firmy -> Dashboard, Pracownicy/Goście -> Job Board.
- **Profile Pracowników:** Modal ze szczegółami pracownika (Bio, Experience, Contact) dostępny teraz z poziomu list Active/Archive Shifts.
- **Timesheets:** Zmieniono nazwę przycisku korekty na **"Add Overtime"**.
- **Poprawki:** Naprawiono zapisywanie pola `description` (Bio) w profilu pracownika.

## 3. Core Business Rules (Critical)

### 3.1 Rate Locking
When a worker is **accepted** for a shift, their hourly rate is "frozen" in the `shift_applications.locked_hourly_rate` field. This ensures:
- Workers are guaranteed the rate they saw when applying
- Subsequent changes to `shifts.hourly_rate` do NOT affect workers already hired
- Payment calculations use `locked_hourly_rate` as the source of truth

**Implementation:**
- Locked at application acceptance via database triggers
- Used by timesheet/payment systems for wage calculation
- Immutable once set (only changeable by admin override)

### 3.2 24-Hour Cancellation Penalty
If a company cancels an **accepted** worker less than 24 hours before the shift start time:

**Automated Process:**
1. `cancel_worker_application()` SQL function is invoked via RPC
2. Checks time difference between cancellation and shift start
3. If < 24 hours:
   - Creates entry in `penalties` table
   - Calculates penalty amount (typically 50% of expected wages)
   - Records reason and timestamp
4. Changes `shift_applications.status` to `rejected`
5. Updates `shift_applications.rejection_reason` with cancellation details

**Business Impact:**
- Protects workers from last-minute income loss
- Encourages companies to manage staffing responsibly
- Penalties tracked for billing/invoice purposes

**Technical Flow:**
```
cancelWorkerAction() → supabase.rpc('cancel_worker_application') → 
SQL function checks time → Creates penalty if < 24h → Returns penalty data
```

### 3.3 Relational Skills System
The system uses a **fully normalized** skills architecture:

**Source of Truth:**
- `shift_requirements` table (junction table): Defines which skills are required for each shift
  - Many-to-Many: Shifts ↔ Skills
  - Columns: `shift_id`, `skill_id`, `is_required`, `minimum_level`
  
- `worker_skills` table: Maps workers to their verified skills
  - Many-to-Many: Workers ↔ Skills
  - Columns: `worker_id`, `skill_id`, `proof_document_id`, `verified`

**Deprecated Fields:**
- `shifts.required_skills` (JSONB array) - Legacy, marked as deprecated
- `shifts.preferred_skills` (JSONB array) - Legacy, marked as deprecated

**Why This Matters:**
- Enables structured skill matching queries
- Allows skill verification workflows
- Supports certification/proof document linking
- Facilitates advanced filtering and recommendations

## 4. 🗄 Database Architecture (Key Tables)

### Core User Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User accounts extending `auth.users`. Roles: `worker`, `company`, `admin` |
| `worker_details` | Worker private data: CPR (encrypted), tax card, bank account, **notification preferences** |
| `company_details` | Company info: CVR, EAN, Stripe ID, subscription status |
| `managers` | Contact persons for shifts: `company_id` (FK), `first_name`, `last_name`, `email`, `phone_number`, `avatar_url` |

### Shift & Application Tables
| Table | Purpose |
|-------|---------|
| `shifts` | Job postings with location, time, rate, vacancies. **New:** `manager_id` (FK -> managers.id) for contact person assignment |
| `shift_requirements` | **Junction table** for Shift ↔ Skills (M:M relationship) |
| `shift_applications` | Worker applications. Statuses: `pending`, `accepted`, `rejected`, `waitlist`, `completed` |
| `shift_applications.locked_hourly_rate` | **Frozen rate** at acceptance time |
| `shift_applications.rejection_reason` | Cancellation/rejection details |

### Skills Tables
| Table | Purpose |
|-------|---------|
| `skills` | Master skills catalog (e.g., "Forklift License", "Food Hygiene Certificate") |
| `worker_skills` | Worker ↔ Skills junction with verification status |

### Financial Tables
| Table | Purpose |
|-------|---------|
| `timesheets` | Clock-in/out records. Statuses: `pending`, `approved`, `disputed`, `paid` |
| `payments` | Payment records linking applications to wages |
| `penalties` | Financial penalties (e.g., late cancellation fees) |
| `ledger_entries` | Complete financial audit trail |

### Supporting Tables
| Table | Purpose |
|-------|---------|
| `locations` | Company work sites with PostGIS coordinates |
| `documents` | KYC/verification documents (ID, criminal record, certifications) |
| `reviews` | Bidirectional ratings (Company ↔ Worker) |
| `strike_history` | Worker disciplinary records |
| `audit_logs` | System-wide change tracking |
| `notification_logs` | User notification history |
| `user_consents` | GDPR consent tracking |

### Database Views (Optimized Queries)
| View | Purpose | Returns |
|------|---------|---------|
| `candidate_skills_view` ✅ | **Preferred** for displaying worker skills in UI | Single row per worker with `languages` and `licenses` as JSONB arrays of `{ id, name }` objects |
| `worker_skills_display` | Individual skill rows with metadata | Multiple rows per worker (one per skill) |

**Usage:**
- Use `candidate_skills_view` when **displaying** worker skills (modals, cards, lists)
  - Pre-aggregated data, no client-side parsing needed
  - Type-safe: `Array<{ id: string; name: string }>`
  - Better performance (fewer rows, smaller payload)
- Use `worker_skills_display` for detailed skill analysis
- Use `worker_skills` table directly when **modifying** skills (add/delete)

See [OPTIMIZATION_CANDIDATE_SKILLS_VIEW.md](./OPTIMIZATION_CANDIDATE_SKILLS_VIEW.md) for details.

### Security & RLS (Row Level Security)
**Public Read Access for Guest Users:**
- Odblokowano dostęp `SELECT` dla roli `anon` (niezalogowani użytkownicy) do następujących tabel:
  - `shifts` (tylko opublikowane zmiany)
  - `locations` (lokalizacje firm)
  - `company_details` (logo, nazwa firmy)
  - `managers` (dane osób kontaktowych - filtrowane na frontendzie)
  - `shift_requirements` & `skills` (wymagane umiejętności)

**Privacy Protection:**
- Polityki RLS pozwalają na odczyt danych technicznych, ale **UI automatycznie ukrywa dane wrażliwe** (telefon, email managera) przed użytkownikami niezalogowanymi (`!user`).
- Zapewnia to publiczny dostęp do ofert pracy (SEO) przy zachowaniu prywatności danych kontaktowych.

## 5. User Roles & UI Structure

### Worker Role
**Two Distinct Sections:**

1. **My Profile** (`/profile`) - Public-facing CV/Portfolio
   - Personal info (name, avatar, bio)
   - Skills and certifications
   - Work history and reviews
   - **Visible to companies** when applying for shifts

2. **Settings** (`/worker/settings`) - Private Control Center
   - Tax information (CPR, tax card type)
   - Bank account details
   - **Notification Preferences:**
     - `notify_on_hired` - Alert when accepted for shift
     - `notify_job_matches` - Shifts matching skills
     - `notify_urgent_jobs` - Last-minute opportunities
     - `notify_all_jobs` - Every new posting
     - `newsletter_subscription` - Marketing emails
   - Password management
   - Document uploads (ID, contracts)

**Worker Workflows:**
- **Job Board** (`/`) - Browse and filter shifts by category, location, date, pay
- **Applications** (`/applications`) - Track application statuses, withdraw applications
- **Schedule** (`/schedule`) - Calendar view of accepted shifts with `.ics` export
- **Timesheets** (`/timesheets`) - View pending/approved hours and payments

### Company Role
**Primary Functions:**

- **Dashboard** (`/dashboard`) - Overview of active shifts, pending applications, upcoming shifts (prioritized view)
- **Managers** (`/managers`) - Add and manage contact persons for shifts
- **Create Shift** (`/create-shift`) - Multi-step form with location, time, skills, pay rate, and manager assignment
- **Shifts Management** (`/shifts`) - Edit shifts, manage applications, cancel workers
- **Candidates** (`/candidates`) - Review applicants with profile modals, accept/reject in bulk
- **Timesheets** (`/timesheets`) - Approve worker hours, add overtime, resolve disputes
- **Billing** (`/billing`) - View penalties, invoices, payment history

**Company Workflows:**
1. Post shift → Workers apply → Accept/reject candidates
2. Shift occurs → Workers clock in/out → Approve timesheets → Process payment
3. Late cancellation → System auto-generates penalty → Reflected in billing

## 6. Security & Compliance

- **CPR Encryption:** All Danish CPR numbers encrypted via `pgcrypto` + Edge Functions
- **Row Level Security (RLS):** Enabled on all tables with role-based policies
- **GDPR Compliance:** Consent tracking, data export, right to deletion
- **Audit Trail:** All critical actions logged to `audit_logs`
- **Private Storage:** Documents stored in Supabase private buckets

## 7. Development

### Project Structure
```
/app
  /[lang]               - Internationalized routes (en/da)
    /(company)          - Company portal (shifts, candidates, billing)
    /worker             - Worker private area (settings)
    /profile            - Worker public profile
    /schedule           - Calendar view
  /actions              - Server Actions (shifts, applications, timesheets)
  /auth/callback        - OAuth callback handler
/components
  /ui                   - Shadcn UI primitives
  /auth                 - Login/register forms
  /company              - Company-specific components
  /worker               - Worker-specific components
  /shifts               - Shift management components
/lib
  /auth.ts              - Authentication utilities
  /date-utils.ts        - Date/time helpers
/utils/supabase
  /client.ts            - Client-side Supabase
  /server.ts            - Server-side Supabase
  /middleware.ts        - Auth middleware
/types
  /database.ts          - TypeScript types from Supabase
/supabase
  /migrations           - Database migration files
  /edge-functions       - Deno functions (CPR encryption)
```

### Getting Started

**Prerequisites:**
- Node.js 18+
- Supabase account with PostgreSQL + PostGIS enabled

**Installation:**
```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.
npm run dev
```

**Key Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side admin key
- `CPR_ENCRYPTION_KEY` - 32-byte hex key for CPR encryption

## 8. Key Features

- ✅ **Manager System:** Company contact persons with privacy-protected details
- ✅ **Public Job Board:** Guest access to shifts with SEO-friendly URLs
- ✅ **Enhanced Dashboard:** Active shifts prioritization with pending applicants badges
- ✅ **Worker Profile Modals:** Quick view of candidate details from shift lists
- ✅ Multilingual support (English/Danish)
- ✅ Real-time application status updates
- ✅ PostGIS-based location search and distance calculation
- ✅ Automated penalty calculation for late cancellations
- ✅ Rate locking to protect worker wages
- ✅ Skill-based job matching
- ✅ Document verification workflows
- ✅ Strike system with automatic bans
- ✅ Timesheet dispute resolution with overtime tracking
- ✅ Calendar export (.ics) for workers
- ✅ Responsive mobile-first design

## License

Proprietary - All rights reserved

