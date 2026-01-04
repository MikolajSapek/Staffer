-- ============================================
-- COMPLETE DATABASE SCHEMA RECREATION
-- Generated from code analysis
-- ============================================
-- This script recreates the database schema based on how the code uses it
-- Run this in Supabase SQL Editor to restore your database

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('worker', 'company', 'admin')),
  email TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  first_name TEXT, -- Added by migration 005
  last_name TEXT,  -- Added by migration 005
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. WORKER DETAILS
-- ============================================
CREATE TABLE IF NOT EXISTS worker_details (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  avatar_url TEXT,
  cpr_number_encrypted TEXT NOT NULL,
  tax_card_type TEXT NOT NULL CHECK (tax_card_type IN ('Hovedkort', 'Bikort', 'Frikort')),
  bank_reg_number TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  su_limit_amount NUMERIC(10,2),
  shirt_size TEXT,
  shoe_size TEXT,
  strike_count INTEGER DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. COMPANY DETAILS
-- ============================================
CREATE TABLE IF NOT EXISTS company_details (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cvr_number TEXT NOT NULL UNIQUE,
  main_address TEXT, -- Added by migration 003
  ean_number TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
  logo_url TEXT,
  cover_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. LOCATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  coordinates GEOGRAPHY(POINT, 4326), -- PostGIS geography type
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SHIFTS
-- ============================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
  vacancies_total INTEGER NOT NULL CHECK (vacancies_total > 0),
  vacancies_taken INTEGER DEFAULT 0 CHECK (vacancies_taken >= 0 AND vacancies_taken <= vacancies_total),
  requirements JSONB DEFAULT '{}',
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'full', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. SHIFT APPLICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS shift_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Added by migration 008
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'waitlist', 'completed')), -- 'completed' added by migration 010
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  worker_message TEXT, -- Added by migration 007
  UNIQUE(shift_id, worker_id)
);

-- ============================================
-- 7. TIMESHEETS
-- ============================================
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMPTZ,
  clock_in_location TEXT,
  clock_out_time TIMESTAMPTZ,
  manager_approved_start TIMESTAMPTZ,
  manager_approved_end TIMESTAMPTZ,
  is_no_show BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disputed', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_id, worker_id)
);

-- ============================================
-- 8. PAYMENTS (Used in code but not in types/database.ts)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES shift_applications(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
  hours_worked NUMERIC(5,2) NOT NULL CHECK (hours_worked >= 0),
  shift_title_snapshot TEXT NOT NULL,
  worker_name_snapshot TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(application_id)
);

-- ============================================
-- 9. DOCUMENTS (KYC)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('id_card_front', 'id_card_back', 'selfie', 'criminal_record', 'driving_license')),
  file_path TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. STRIKE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS strike_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  issued_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. USER CONSENTS (GDPR)
-- ============================================
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('terms', 'privacy', 'cookies')),
  version TEXT NOT NULL,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, consent_type, version)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_shifts_company ON shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_end_time ON shifts(end_time);
CREATE INDEX IF NOT EXISTS idx_shift_applications_worker ON shift_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_shift_applications_shift ON shift_applications(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_applications_status ON shift_applications(status);
CREATE INDEX IF NOT EXISTS idx_shift_applications_company ON shift_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_worker ON timesheets(worker_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_locations_company ON locations(company_id);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_payments_application ON payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_worker ON payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_shift ON payments(shift_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================
-- FUNCTIONS: Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_worker_details_updated_at ON worker_details;
CREATE TRIGGER update_worker_details_updated_at BEFORE UPDATE ON worker_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_details_updated_at ON company_details;
CREATE TRIGGER update_company_details_updated_at BEFORE UPDATE ON company_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timesheets_updated_at ON timesheets;
CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS: CPR Encryption/Decryption
-- ============================================
CREATE OR REPLACE FUNCTION encrypt_cpr(cpr_text TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    encrypt(cpr_text::bytea, encryption_key::bytea, 'aes'),
    'base64'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_cpr(cpr_encrypted TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN convert_from(
    decrypt(decode(cpr_encrypted, 'base64'), encryption_key::bytea, 'aes'),
    'UTF8'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTIONS: Business Logic
-- ============================================

-- Auto-ban worker if strike_count >= 3
CREATE OR REPLACE FUNCTION check_strike_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.strike_count >= 3 THEN
    NEW.is_banned = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_strike_limit_trigger ON worker_details;
CREATE TRIGGER check_strike_limit_trigger
  BEFORE UPDATE ON worker_details
  FOR EACH ROW
  WHEN (NEW.strike_count >= 3)
  EXECUTE FUNCTION check_strike_limit();

-- Update shift status to 'full' when vacancies_taken == vacancies_total
CREATE OR REPLACE FUNCTION update_shift_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vacancies_taken >= NEW.vacancies_total THEN
    NEW.status = 'full';
  ELSIF NEW.vacancies_taken < NEW.vacancies_total AND NEW.status = 'full' THEN
    NEW.status = 'published';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shift_status_trigger ON shifts;
CREATE TRIGGER update_shift_status_trigger
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_status();

-- Handle waitlist when shift becomes full
CREATE OR REPLACE FUNCTION handle_waitlist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vacancies_taken >= NEW.vacancies_total AND OLD.vacancies_taken < OLD.vacancies_total THEN
    UPDATE shift_applications
    SET status = 'waitlist'
    WHERE shift_id = NEW.id
      AND status = 'pending'
      AND id NOT IN (
        SELECT id FROM shift_applications
        WHERE shift_id = NEW.id
        AND status = 'accepted'
        ORDER BY applied_at
        LIMIT NEW.vacancies_total
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_waitlist_trigger ON shifts;
CREATE TRIGGER handle_waitlist_trigger
  AFTER UPDATE ON shifts
  FOR EACH ROW
  WHEN (NEW.vacancies_taken <> OLD.vacancies_taken)
  EXECUTE FUNCTION handle_waitlist();

-- Update vacancies_taken when application status changes
CREATE OR REPLACE FUNCTION update_vacancies_on_application_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT: If new application is approved or accepted, increment
  IF TG_OP = 'INSERT' AND (NEW.status = 'approved' OR NEW.status = 'accepted') THEN
    UPDATE shifts
    SET vacancies_taken = COALESCE(vacancies_taken, 0) + 1
    WHERE id = NEW.shift_id;
    RETURN NEW;
  END IF;

  -- Handle UPDATE: Check status changes
  IF TG_OP = 'UPDATE' THEN
    -- If status changed to 'approved' or 'accepted', increment
    IF (NEW.status = 'approved' OR NEW.status = 'accepted') 
       AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'accepted')) THEN
      UPDATE shifts
      SET vacancies_taken = COALESCE(vacancies_taken, 0) + 1
      WHERE id = NEW.shift_id;
    END IF;

    -- If status changed from 'approved' or 'accepted' to something else, decrement
    IF (OLD.status = 'approved' OR OLD.status = 'accepted') 
       AND (NEW.status != 'approved' AND NEW.status != 'accepted') THEN
      UPDATE shifts
      SET vacancies_taken = GREATEST(COALESCE(vacancies_taken, 0) - 1, 0)
      WHERE id = NEW.shift_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vacancies_on_application_change_trigger ON shift_applications;
CREATE TRIGGER update_vacancies_on_application_change_trigger
  AFTER INSERT OR UPDATE OF status ON shift_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_vacancies_on_application_change();

-- Sync worker_details to profiles
CREATE OR REPLACE FUNCTION sync_worker_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    updated_at = NOW()
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_worker_details_change ON public.worker_details;
CREATE TRIGGER on_worker_details_change
  AFTER UPDATE OR INSERT ON public.worker_details
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_worker_profile_data();

-- Sync company_details to profiles
CREATE OR REPLACE FUNCTION sync_company_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    last_name = NEW.company_name,
    first_name = NULL,
    updated_at = NOW()
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_details_change ON public.company_details;
CREATE TRIGGER on_company_details_change
  AFTER UPDATE OR INSERT ON public.company_details
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_company_profile_data();

-- Handle new user creation (trigger for auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
  meta_first_name TEXT;
  meta_last_name TEXT;
  meta_company_name TEXT;
  meta_cvr_number TEXT;
BEGIN
  user_role := new.raw_user_meta_data->>'role';
  meta_first_name := new.raw_user_meta_data->>'first_name';
  meta_last_name := new.raw_user_meta_data->>'last_name';
  meta_company_name := new.raw_user_meta_data->>'company_name';
  meta_cvr_number := new.raw_user_meta_data->>'cvr_number';

  IF user_role NOT IN ('worker', 'company', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be worker, company, or admin', user_role;
  END IF;

  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    user_role,
    CASE 
      WHEN user_role = 'worker' THEN meta_first_name 
      ELSE NULL
    END,
    CASE 
      WHEN user_role = 'worker' THEN meta_last_name
      WHEN user_role = 'company' THEN meta_company_name
      ELSE 'Unknown'
    END
  );

  IF user_role = 'worker' THEN
    INSERT INTO public.worker_details (
      profile_id, 
      first_name, 
      last_name,
      phone_number,
      cpr_number_encrypted,
      tax_card_type,
      bank_reg_number,
      bank_account_number
    )
    VALUES (
      new.id, 
      COALESCE(meta_first_name, ''),
      COALESCE(meta_last_name, ''),
      '',
      '',
      'Hovedkort',
      '',
      ''
    );
  END IF;

  IF user_role = 'company' THEN
    INSERT INTO public.company_details (
      profile_id, 
      company_name, 
      cvr_number
    )
    VALUES (
      new.id, 
      COALESCE(meta_company_name, 'New Company'), 
      COALESCE(meta_cvr_number, 'PENDING-' || new.id::TEXT)
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RPC FUNCTIONS (Used by code but not in migrations)
-- ============================================

-- Get worker profile with decrypted CPR
CREATE OR REPLACE FUNCTION get_worker_profile_secure()
RETURNS TABLE (
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  cpr_number TEXT, -- Decrypted
  tax_card_type TEXT,
  bank_reg_number TEXT,
  bank_account_number TEXT,
  su_limit_amount NUMERIC,
  shirt_size TEXT,
  shoe_size TEXT,
  strike_count INTEGER,
  is_banned BOOLEAN,
  description TEXT,
  experience TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from environment (in production, use secure vault)
  encryption_key := current_setting('app.settings.cpr_encryption_key', true);
  
  -- If key not set, return empty (function will fail gracefully)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;

  RETURN QUERY
  SELECT 
    wd.profile_id,
    wd.first_name,
    wd.last_name,
    wd.phone_number,
    wd.avatar_url,
    decrypt_cpr(wd.cpr_number_encrypted, encryption_key) as cpr_number,
    wd.tax_card_type,
    wd.bank_reg_number,
    wd.bank_account_number,
    wd.su_limit_amount,
    wd.shirt_size,
    wd.shoe_size,
    wd.strike_count,
    wd.is_banned,
    NULL::TEXT as description, -- Add if you have this column
    NULL::TEXT as experience,  -- Add if you have this column
    wd.created_at,
    wd.updated_at
  FROM worker_details wd
  WHERE wd.profile_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert worker profile securely (encrypts CPR)
CREATE OR REPLACE FUNCTION upsert_worker_secure(
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone_number TEXT,
  p_cpr_number TEXT,
  p_tax_card_type TEXT,
  p_bank_reg_number TEXT,
  p_bank_account_number TEXT,
  p_avatar_url TEXT DEFAULT NULL,
  p_id_card_url TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_experience TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  encryption_key TEXT;
  encrypted_cpr TEXT;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  encryption_key := current_setting('app.settings.cpr_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;

  -- Encrypt CPR if provided
  IF p_cpr_number IS NOT NULL AND p_cpr_number != '' THEN
    encrypted_cpr := encrypt_cpr(p_cpr_number, encryption_key);
  ELSE
    -- Keep existing encrypted CPR if not provided
    SELECT cpr_number_encrypted INTO encrypted_cpr
    FROM worker_details
    WHERE profile_id = current_user_id;
  END IF;

  -- Upsert worker_details
  INSERT INTO worker_details (
    profile_id,
    first_name,
    last_name,
    phone_number,
    cpr_number_encrypted,
    tax_card_type,
    bank_reg_number,
    bank_account_number,
    avatar_url
  )
  VALUES (
    current_user_id,
    p_first_name,
    p_last_name,
    p_phone_number,
    COALESCE(encrypted_cpr, ''),
    p_tax_card_type,
    p_bank_reg_number,
    p_bank_account_number,
    p_avatar_url
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    cpr_number_encrypted = COALESCE(EXCLUDED.cpr_number_encrypted, worker_details.cpr_number_encrypted),
    tax_card_type = EXCLUDED.tax_card_type,
    bank_reg_number = EXCLUDED.bank_reg_number,
    bank_account_number = EXCLUDED.bank_account_number,
    avatar_url = COALESCE(EXCLUDED.avatar_url, worker_details.avatar_url),
    updated_at = NOW();

  -- Note: id_card_url, description, experience columns might need to be added to worker_details if used
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert company profile securely
CREATE OR REPLACE FUNCTION upsert_company_secure(
  p_company_name TEXT,
  p_cvr_number TEXT,
  p_main_address TEXT DEFAULT NULL,
  p_ean_number TEXT DEFAULT NULL,
  p_invoice_email TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_cover_photo_url TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  INSERT INTO company_details (
    profile_id,
    company_name,
    cvr_number,
    main_address,
    ean_number,
    logo_url,
    cover_photo_url
  )
  VALUES (
    current_user_id,
    p_company_name,
    p_cvr_number,
    p_main_address,
    p_ean_number,
    p_logo_url,
    p_cover_photo_url
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    company_name = EXCLUDED.company_name,
    cvr_number = EXCLUDED.cvr_number,
    main_address = COALESCE(EXCLUDED.main_address, company_details.main_address),
    ean_number = COALESCE(EXCLUDED.ean_number, company_details.ean_number),
    logo_url = COALESCE(EXCLUDED.logo_url, company_details.logo_url),
    cover_photo_url = COALESCE(EXCLUDED.cover_photo_url, company_details.cover_photo_url),
    updated_at = NOW();

  -- Note: invoice_email and description columns might need to be added to company_details if used
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE strike_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean recreation)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

DROP POLICY IF EXISTS "Workers can view their own details" ON worker_details;
DROP POLICY IF EXISTS "Workers can update their own details" ON worker_details;
DROP POLICY IF EXISTS "Admins can view all worker details" ON worker_details;

DROP POLICY IF EXISTS "Companies can view their own details" ON company_details;
DROP POLICY IF EXISTS "Companies can update their own details" ON company_details;

DROP POLICY IF EXISTS "Companies can view their own locations" ON locations;
DROP POLICY IF EXISTS "Companies can manage their own locations" ON locations;
DROP POLICY IF EXISTS "Workers can view published locations" ON locations;

DROP POLICY IF EXISTS "Companies can view their own shifts" ON shifts;
DROP POLICY IF EXISTS "Companies can manage their own shifts" ON shifts;
DROP POLICY IF EXISTS "Workers can view published shifts" ON shifts;

DROP POLICY IF EXISTS "Workers can view their own applications" ON shift_applications;
DROP POLICY IF EXISTS "Workers can create their own applications" ON shift_applications;
DROP POLICY IF EXISTS "Workers can update their own applications" ON shift_applications;
DROP POLICY IF EXISTS "Companies can view applications for their shifts" ON shift_applications;
DROP POLICY IF EXISTS "Companies can update applications for their shifts" ON shift_applications;

DROP POLICY IF EXISTS "Workers can view their own timesheets" ON timesheets;
DROP POLICY IF EXISTS "Companies can view timesheets for their shifts" ON timesheets;
DROP POLICY IF EXISTS "Companies can update timesheets for their shifts" ON timesheets;

DROP POLICY IF EXISTS "Workers can view their own documents" ON documents;
DROP POLICY IF EXISTS "Workers can manage their own documents" ON documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;

DROP POLICY IF EXISTS "Users can view their own strike history" ON strike_history;
DROP POLICY IF EXISTS "Admins can view all strike history" ON strike_history;
DROP POLICY IF EXISTS "Admins can create strike history" ON strike_history;

DROP POLICY IF EXISTS "Users can view their own consents" ON user_consents;
DROP POLICY IF EXISTS "Users can manage their own consents" ON user_consents;

DROP POLICY IF EXISTS "Companies can view payments for their shifts" ON payments;
DROP POLICY IF EXISTS "Workers can view their own payments" ON payments;
DROP POLICY IF EXISTS "Companies can create payments for their shifts" ON payments;
DROP POLICY IF EXISTS "Companies can update payments for their shifts" ON payments;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- WORKER_DETAILS POLICIES
CREATE POLICY "Workers can view their own details"
  ON worker_details FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Workers can update their own details"
  ON worker_details FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Admins can view all worker details"
  ON worker_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- COMPANY_DETAILS POLICIES
CREATE POLICY "Companies can view their own details"
  ON company_details FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Companies can update their own details"
  ON company_details FOR UPDATE
  USING (auth.uid() = profile_id);

-- LOCATIONS POLICIES
CREATE POLICY "Companies can view their own locations"
  ON locations FOR SELECT
  USING (auth.uid() = company_id);

CREATE POLICY "Companies can manage their own locations"
  ON locations FOR ALL
  USING (auth.uid() = company_id);

CREATE POLICY "Workers can view published locations"
  ON locations FOR SELECT
  USING (true); -- Allow viewing for job board

-- SHIFTS POLICIES
CREATE POLICY "Companies can view their own shifts"
  ON shifts FOR SELECT
  USING (auth.uid() = company_id);

CREATE POLICY "Companies can manage their own shifts"
  ON shifts FOR ALL
  USING (auth.uid() = company_id);

CREATE POLICY "Workers can view published shifts"
  ON shifts FOR SELECT
  USING (status IN ('published', 'full'));

-- SHIFT_APPLICATIONS POLICIES
CREATE POLICY "Workers can view their own applications"
  ON shift_applications FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create their own applications"
  ON shift_applications FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can update their own applications"
  ON shift_applications FOR UPDATE
  USING (auth.uid() = worker_id);

CREATE POLICY "Companies can view applications for their shifts"
  ON shift_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = shift_applications.shift_id
      AND shifts.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update applications for their shifts"
  ON shift_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = shift_applications.shift_id
      AND shifts.company_id = auth.uid()
    )
  );

-- TIMESHEETS POLICIES
CREATE POLICY "Workers can view their own timesheets"
  ON timesheets FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Companies can view timesheets for their shifts"
  ON timesheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = timesheets.shift_id
      AND shifts.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update timesheets for their shifts"
  ON timesheets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = timesheets.shift_id
      AND shifts.company_id = auth.uid()
    )
  );

-- DOCUMENTS POLICIES
CREATE POLICY "Workers can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can manage their own documents"
  ON documents FOR ALL
  USING (auth.uid() = worker_id);

CREATE POLICY "Admins can view all documents"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- STRIKE_HISTORY POLICIES
CREATE POLICY "Users can view their own strike history"
  ON strike_history FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Admins can view all strike history"
  ON strike_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create strike history"
  ON strike_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- AUDIT_LOGS POLICIES (typically admin-only)
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- USER_CONSENTS POLICIES
CREATE POLICY "Users can view their own consents"
  ON user_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consents"
  ON user_consents FOR ALL
  USING (auth.uid() = user_id);

-- PAYMENTS POLICIES
CREATE POLICY "Companies can view payments for their shifts"
  ON payments FOR SELECT
  USING (auth.uid() = company_id);

CREATE POLICY "Workers can view their own payments"
  ON payments FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Companies can create payments for their shifts"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = payments.shift_id
      AND shifts.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update payments for their shifts"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = payments.shift_id
      AND shifts.company_id = auth.uid()
    )
  );

-- ============================================
-- NOTES
-- ============================================
-- 1. RPC functions (get_worker_profile_secure, upsert_worker_secure, upsert_company_secure) 
--    require encryption key to be set in PostgreSQL config:
--    ALTER DATABASE your_database SET app.settings.cpr_encryption_key = 'your-32-byte-hex-key';
--    Or set via Supabase dashboard: Settings → Database → Custom Config
--
-- 2. Some columns referenced in code (like description, experience in worker_details, 
--    or invoice_email in company_details) might need to be added if your code uses them.
--
-- 3. The trigger handle_new_user() creates profiles automatically on auth.users insert.
--    Make sure this is set up correctly for your authentication flow.
--
-- 4. RLS policies are basic - you may need to adjust them based on your specific requirements.

