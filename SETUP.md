# Setup Guide - Vikar System

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials:
     - Get `NEXT_PUBLIC_SUPABASE_URL` from your Supabase project settings
     - Get `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project settings
     - Get `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project settings (keep this secret!)
     - Generate `CPR_ENCRYPTION_KEY` with: `openssl rand -hex 32`

3. **Set Up Database**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Run the migration

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Database Setup Details

### Running the Migration

1. Open Supabase Dashboard → SQL Editor
2. Create a new query
3. Paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" or press Cmd/Ctrl + Enter

### Verifying Setup

After running the migration, verify these tables exist:
- `profiles`
- `worker_details`
- `company_details`
- `locations`
- `shifts`
- `shift_applications`
- `timesheets`
- `documents`
- `strike_history`
- `audit_logs`
- `user_consents`

### Testing RLS Policies

RLS is enabled on all tables. Test by:
1. Creating a test user via Supabase Auth
2. Creating a profile for that user
3. Verifying they can only see their own data

## Edge Functions Setup (Optional)

For CPR encryption/decryption, deploy Edge Functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy encrypt-cpr
supabase functions deploy decrypt-cpr
```

## Creating Your First Admin User

1. Sign up a regular user via `/register`
2. Go to Supabase Dashboard → Table Editor → `profiles`
3. Find your user and change `role` to `'admin'`
4. Log in again - you'll now have admin access

## Next Steps

- Configure Stripe for payments (optional)
- Set up email templates in Supabase
- Configure storage buckets for document uploads
- Add Google Maps API key for map features

