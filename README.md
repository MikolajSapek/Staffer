# Vikar System - Danish Staffing Platform

A comprehensive B2B staffing platform connecting companies with temporary workers, built with Next.js 15, Supabase, and TypeScript.

## Features

### Company Portal
- Company onboarding with CVR integration
- Shift creation and management
- Applicant management with bulk hiring
- Time approval and payroll management
- Waitlist handling

### Worker Portal
- Job board with filtering
- Application management
- Calendar integration (.ics export)
- Strike system warnings
- Profile and document management

### Admin Portal
- User management and verification
- Impersonation (God Mode)
- Payroll export (Danløn/Dataløn compatible)
- Strike management

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React, Tailwind CSS, Shadcn UI
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Language:** TypeScript (Strict)
- **Validation:** Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
cd Staffer
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)
- `CPR_ENCRYPTION_KEY` - A secure key for CPR encryption (32 bytes hex)

3. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the migration file: `supabase/migrations/001_initial_schema.sql`

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The database includes:
- **profiles** - User profiles with roles
- **worker_details** - Worker-specific data (CPR encrypted)
- **company_details** - Company information
- **locations** - Company locations with PostGIS coordinates
- **shifts** - Job postings
- **shift_applications** - Worker applications
- **timesheets** - Time tracking and payroll
- **documents** - KYC documents
- **strike_history** - Strike tracking
- **audit_logs** - System audit trail
- **user_consents** - GDPR consents

## Security Features

- **CPR Encryption:** All CPR numbers are encrypted using pgcrypto
- **Row Level Security (RLS):** All tables have RLS policies
- **Role-based Access Control:** Routes protected by user role
- **Document Storage:** Private buckets for sensitive documents

## Business Rules

1. **Strike System:** Workers get strikes for no-shows or late cancellations (<24h). 3 strikes = automatic ban.
2. **Waitlist:** When shifts are full, workers join waitlist. First-come-first-served when spots open.
3. **Payroll Export:** CSV format compatible with Danløn/Dataløn (CPR, Hours, Rate, Tax Card).

## Development

### Project Structure

```
/app
  /company      - Company portal pages
  /worker       - Worker portal pages
  /admin        - Admin portal pages
  /login        - Authentication
/components
  /ui           - Shadcn UI components
  /auth         - Authentication components
  /navigation   - Navigation components
/lib
  /supabase     - Supabase client configuration
  /validations  - Zod schemas
/supabase
  /migrations   - Database migrations
/types          - TypeScript types
```

## License

Proprietary - All rights reserved

