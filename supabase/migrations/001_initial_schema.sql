-- Enable required extensions
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
  cpr_number_encrypted TEXT NOT NULL, -- Encrypted with pgcrypto
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'waitlist')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_id, worker_id) -- Prevent duplicate applications
);

-- ============================================
-- 7. TIMESHEETS (Payroll Core)
-- ============================================
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMPTZ,
  clock_in_location TEXT, -- GPS coordinates
  clock_out_time TIMESTAMPTZ,
  manager_approved_start TIMESTAMPTZ,
  manager_approved_end TIMESTAMPTZ,
  is_no_show BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disputed', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_id, worker_id) -- One timesheet per shift per worker
);

-- ============================================
-- 8. DOCUMENTS (KYC)
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
-- 9. STRIKE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS strike_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  issued_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. AUDIT LOGS
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
-- 11. USER CONSENTS (GDPR)
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
CREATE INDEX IF NOT EXISTS idx_shift_applications_worker ON shift_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_shift_applications_shift ON shift_applications(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_applications_status ON shift_applications(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_worker ON timesheets(worker_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_locations_company ON locations(company_id);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST(coordinates);

-- ============================================
-- FUNCTIONS FOR CPR ENCRYPTION/DECRYPTION
-- ============================================
-- NOTE: The encryption key should be stored in environment variables
-- and passed to these functions securely. This is a placeholder structure.

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
-- FUNCTION: Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_details_updated_at BEFORE UPDATE ON worker_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_details_updated_at BEFORE UPDATE ON company_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Auto-ban worker if strike_count >= 3
-- ============================================
CREATE OR REPLACE FUNCTION check_strike_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.strike_count >= 3 THEN
    NEW.is_banned = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_strike_limit_trigger
  BEFORE UPDATE ON worker_details
  FOR EACH ROW
  WHEN (NEW.strike_count >= 3)
  EXECUTE FUNCTION check_strike_limit();

-- ============================================
-- FUNCTION: Update shift status to 'full' when vacancies_taken == vacancies_total
-- ============================================
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

CREATE TRIGGER update_shift_status_trigger
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_status();

-- ============================================
-- FUNCTION: Handle waitlist when shift becomes full
-- ============================================
CREATE OR REPLACE FUNCTION handle_waitlist()
RETURNS TRIGGER AS $$
BEGIN
  -- When shift becomes full, move pending applications to waitlist
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

CREATE TRIGGER handle_waitlist_trigger
  AFTER UPDATE ON shifts
  FOR EACH ROW
  WHEN (NEW.vacancies_taken <> OLD.vacancies_taken)
  EXECUTE FUNCTION handle_waitlist();

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
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.location_id = locations.id
      AND shifts.status = 'published'
    )
  );

-- SHIFTS POLICIES
CREATE POLICY "Companies can manage their own shifts"
  ON shifts FOR ALL
  USING (auth.uid() = company_id);

CREATE POLICY "Workers can view published shifts"
  ON shifts FOR SELECT
  USING (status = 'published' OR auth.uid() = company_id);

CREATE POLICY "Admins can view all shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- SHIFT_APPLICATIONS POLICIES
CREATE POLICY "Workers can view their own applications"
  ON shift_applications FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create their own applications"
  ON shift_applications FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

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

CREATE POLICY "Workers can create their own timesheets"
  ON timesheets FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

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

CREATE POLICY "Workers can upload their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Admins can view all documents"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- STRIKE_HISTORY POLICIES
CREATE POLICY "Workers can view their own strike history"
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

-- AUDIT_LOGS POLICIES
CREATE POLICY "Admins can view all audit logs"
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

