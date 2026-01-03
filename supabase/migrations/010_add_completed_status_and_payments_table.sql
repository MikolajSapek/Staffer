-- ============================================
-- Add 'completed' status to shift_applications
-- ============================================
ALTER TABLE shift_applications
DROP CONSTRAINT IF EXISTS shift_applications_status_check;

ALTER TABLE shift_applications
ADD CONSTRAINT shift_applications_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'waitlist', 'completed'));

-- ============================================
-- Create PAYMENTS table
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
  UNIQUE(application_id) -- One payment per application
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_application ON payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_worker ON payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_shift ON payments(shift_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
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


