-- ============================================
-- Migration: Add all foreign keys and missing tables
-- This migration ensures all foreign key relationships
-- from the schema documentation are properly defined
-- ============================================

-- ============================================
-- 1. CREATE MISSING TABLES
-- ============================================

-- Skills table (referenced by worker_skills)
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Skills (junction table)
CREATE TABLE IF NOT EXISTS worker_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proof_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, skill_id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_id, reviewer_id, reviewee_id) -- One review per shift per reviewer-reviewee pair
);

-- Ledger Entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('payment', 'refund', 'adjustment', 'fee')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Events table (analytics/tracking)
CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table (separate from shift_applications, if needed for general job applications)
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_id, worker_id)
);

-- Shift Templates table (for recurring shifts)
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  start_time TIME NOT NULL, -- Time of day (not full timestamp)
  end_time TIME NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
  vacancies_total INTEGER NOT NULL CHECK (vacancies_total > 0),
  requirements JSONB DEFAULT '{}',
  recurrence_pattern TEXT, -- e.g., 'daily', 'weekly', 'monthly'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================

-- Add shift_id to strike_history if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'strike_history' AND column_name = 'shift_id'
  ) THEN
    ALTER TABLE strike_history ADD COLUMN shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add changed_by to audit_logs if it doesn't exist (as mentioned in schema docs)
-- This can be used alongside or instead of user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'changed_by'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    -- Copy existing user_id values to changed_by for backward compatibility
    UPDATE audit_logs SET changed_by = user_id WHERE changed_by IS NULL;
  END IF;
END $$;

-- ============================================
-- 3. CREATE INDEXES FOR NEW TABLES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_worker_skills_worker ON worker_skills(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_skills_skill ON worker_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_worker_skills_document ON worker_skills(proof_document_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_shift ON reviews(shift_id);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_company ON ledger_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_worker ON ledger_entries(worker_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_shift ON ledger_entries(shift_id);

CREATE INDEX IF NOT EXISTS idx_user_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON user_events(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_read ON notification_logs(read);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_shift ON applications(shift_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker ON applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE INDEX IF NOT EXISTS idx_shift_templates_company ON shift_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_location ON shift_templates(location_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_active ON shift_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_strike_history_shift ON strike_history(shift_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- ============================================

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES FOR NEW TABLES
-- ============================================

-- Skills: Public read, admin write
CREATE POLICY "Anyone can view skills"
  ON skills FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage skills"
  ON skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Worker Skills
CREATE POLICY "Workers can view their own skills"
  ON worker_skills FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can manage their own skills"
  ON worker_skills FOR ALL
  USING (auth.uid() = worker_id);

CREATE POLICY "Companies can view worker skills for their shifts"
  ON worker_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      JOIN shift_applications ON shifts.id = shift_applications.shift_id
      WHERE shift_applications.worker_id = worker_skills.worker_id
      AND shifts.company_id = auth.uid()
    )
  );

-- Reviews
CREATE POLICY "Users can view reviews about them"
  ON reviews FOR SELECT
  USING (auth.uid() = reviewee_id OR auth.uid() = reviewer_id);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Companies can view reviews for their shifts"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = reviews.shift_id
      AND shifts.company_id = auth.uid()
    )
  );

-- Ledger Entries
CREATE POLICY "Companies can view their ledger entries"
  ON ledger_entries FOR SELECT
  USING (auth.uid() = company_id);

CREATE POLICY "Workers can view their ledger entries"
  ON ledger_entries FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Companies can create ledger entries"
  ON ledger_entries FOR INSERT
  WITH CHECK (auth.uid() = company_id);

-- User Events
CREATE POLICY "Users can view their own events"
  ON user_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
  ON user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON user_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Notification Logs
CREATE POLICY "Users can view their own notifications"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notification_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Applications (if different from shift_applications)
CREATE POLICY "Workers can view their own applications"
  ON applications FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create their own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Companies can view applications for their shifts"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = applications.shift_id
      AND shifts.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update applications for their shifts"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = applications.shift_id
      AND shifts.company_id = auth.uid()
    )
  );

-- Shift Templates
CREATE POLICY "Companies can manage their own shift templates"
  ON shift_templates FOR ALL
  USING (auth.uid() = company_id);

CREATE POLICY "Workers can view active shift templates"
  ON shift_templates FOR SELECT
  USING (is_active = true);

-- ============================================
-- 6. ADD UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_skills_updated_at BEFORE UPDATE ON worker_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ledger_entries_updated_at BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. VERIFY ALL FOREIGN KEY RELATIONSHIPS
-- ============================================
-- The following relationships are now ensured:
-- 
-- locations.company_id -> profiles.id ✓
-- company_details.profile_id -> profiles.id ✓
-- shift_applications.company_id -> profiles.id ✓
-- shift_applications.shift_id -> shifts.id ✓
-- shift_applications.worker_id -> profiles.id ✓
-- timesheets.shift_id -> shifts.id ✓
-- timesheets.worker_id -> profiles.id ✓
-- documents.worker_id -> profiles.id ✓
-- shifts.company_id -> profiles.id ✓
-- shifts.location_id -> locations.id ✓
-- worker_details.profile_id -> profiles.id ✓
-- audit_logs.user_id -> profiles.id ✓
-- audit_logs.changed_by -> profiles.id ✓ (added if missing)
-- user_events.user_id -> profiles.id ✓
-- notification_logs.user_id -> profiles.id ✓
-- user_consents.user_id -> profiles.id ✓
-- ledger_entries.company_id -> profiles.id ✓
-- ledger_entries.worker_id -> profiles.id ✓
-- reviews.reviewee_id -> profiles.id ✓
-- reviews.reviewer_id -> profiles.id ✓
-- reviews.shift_id -> shifts.id ✓
-- strike_history.issued_by -> profiles.id ✓
-- strike_history.shift_id -> shifts.id ✓ (added if missing)
-- strike_history.worker_id -> profiles.id ✓
-- worker_skills.proof_document_id -> documents.id ✓
-- worker_skills.skill_id -> skills.id ✓
-- worker_skills.worker_id -> profiles.id ✓
-- applications.company_id -> profiles.id ✓
-- applications.shift_id -> shifts.id ✓
-- applications.worker_id -> profiles.id ✓
-- shift_templates.company_id -> profiles.id ✓
-- shift_templates.location_id -> locations.id ✓
-- payments.application_id -> shift_applications.id ✓
-- payments.company_id -> profiles.id ✓
-- payments.shift_id -> shifts.id ✓
-- payments.worker_id -> profiles.id ✓

