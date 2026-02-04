-- Cancellation Policy: cancellation_fees, banned_until, strike_history updates
-- ZADANIE 1: Company cancels accepted worker -> cancellation_fees (500 DKK late fee)
-- ZADANIE 2: Worker withdraws/cancels -> strike_history + banned_until
-- ZADANIE 3: Apply button disabled when worker.banned_until > now()

-- 1. Create cancellation_fees table (company late cancellation penalty)
CREATE TABLE IF NOT EXISTS public.cancellation_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.shift_applications(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 500,
  reason TEXT NOT NULL DEFAULT 'Late cancellation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_fees_company ON public.cancellation_fees(company_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_fees_shift ON public.cancellation_fees(shift_id);

ALTER TABLE public.cancellation_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view own cancellation fees"
  ON public.cancellation_fees FOR SELECT
  USING (auth.uid() = company_id);

-- RPC runs as SECURITY DEFINER but auth.uid() is the caller (company)
CREATE POLICY "Companies can insert own cancellation fees"
  ON public.cancellation_fees FOR INSERT
  WITH CHECK (auth.uid() = company_id);

-- 2. Add banned_until to worker_details (worker late cancellation ban)
ALTER TABLE public.worker_details
  ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ DEFAULT NULL;

-- 3. Ensure strike_history has shift_id (some schemas may have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'strike_history' AND column_name = 'shift_id'
  ) THEN
    ALTER TABLE public.strike_history ADD COLUMN shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. shift_applications.status: 'cancelled' is valid (typically TEXT without strict check)

-- 5. Create or replace cancel_worker_application RPC (Company cancels accepted worker)
CREATE OR REPLACE FUNCTION public.cancel_worker_application(
  p_application_id UUID,
  p_cancel_reason TEXT,
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_shift RECORD;
  v_hours_to_start NUMERIC;
  v_late_cancellation BOOLEAN := FALSE;
  v_penalty_amount NUMERIC := 0;
  v_application_id_uuid UUID;
BEGIN
  -- Fetch application and shift
  SELECT sa.*, s.company_id AS shift_company_id, s.start_time
  INTO v_app
  FROM shift_applications sa
  JOIN shifts s ON s.id = sa.shift_id
  WHERE sa.id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.shift_company_id != p_company_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_app.status NOT IN ('accepted', 'completed') THEN
    RAISE EXCEPTION 'Can only cancel accepted applications';
  END IF;

  -- Check if < 24h before start
  v_hours_to_start := EXTRACT(EPOCH FROM (v_app.start_time - NOW())) / 3600.0;

  IF v_hours_to_start < 24 AND v_hours_to_start > 0 THEN
    v_late_cancellation := TRUE;
    v_penalty_amount := 500;

    -- Insert cancellation_fees record
    INSERT INTO cancellation_fees (shift_id, company_id, application_id, amount, reason)
    VALUES (v_app.shift_id, p_company_id, p_application_id, v_penalty_amount, 'Late cancellation');
  END IF;

  -- Update application status to 'cancelled'
  UPDATE shift_applications
  SET status = 'cancelled',
      rejection_reason = p_cancel_reason,
      updated_at = NOW()
  WHERE id = p_application_id;

  -- Decrement vacancies_taken
  UPDATE shifts
  SET vacancies_taken = GREATEST(0, vacancies_taken - 1),
      updated_at = NOW()
  WHERE id = v_app.shift_id;

  RETURN jsonb_build_object(
    'late_cancellation', v_late_cancellation,
    'penalty_amount', v_penalty_amount
  );
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.cancel_worker_application(UUID, TEXT, UUID) TO authenticated;

-- 6. Create worker_cancel_shift RPC (Worker self-cancels accepted shift)
-- Handles strike_history insert + banned_until update + application status + vacancies
CREATE OR REPLACE FUNCTION public.worker_cancel_shift(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_shift RECORD;
  v_hours_to_start NUMERIC;
  v_late_cancellation BOOLEAN := FALSE;
  v_worker_id UUID;
BEGIN
  v_worker_id := auth.uid();
  IF v_worker_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT sa.id AS app_id, sa.shift_id, sa.status,
         s.start_time, s.vacancies_taken
  INTO v_app
  FROM shift_applications sa
  JOIN shifts s ON s.id = sa.shift_id
  WHERE sa.id = p_application_id AND sa.worker_id = v_worker_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.status != 'accepted' THEN
    RAISE EXCEPTION 'Can only cancel accepted applications';
  END IF;

  v_hours_to_start := EXTRACT(EPOCH FROM (v_app.start_time - NOW())) / 3600.0;
  v_late_cancellation := v_hours_to_start < 24 AND v_hours_to_start > 0;

  -- Insert strike_history (shift_id may be optional in some schemas)
  INSERT INTO strike_history (worker_id, shift_id, reason, issued_by)
  VALUES (v_worker_id, v_app.shift_id, 'Late cancellation', v_worker_id);

  -- If late: set banned_until
  IF v_late_cancellation THEN
    UPDATE worker_details
    SET banned_until = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE profile_id = v_worker_id;
  END IF;

  -- Update application to cancelled
  UPDATE shift_applications
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_application_id;

  -- Decrement vacancies_taken
  UPDATE shifts
  SET vacancies_taken = GREATEST(0, v_app.vacancies_taken - 1),
      updated_at = NOW()
  WHERE id = v_app.shift_id;

  RETURN jsonb_build_object('late_cancellation', v_late_cancellation);
END;
$$;

GRANT EXECUTE ON FUNCTION public.worker_cancel_shift(UUID) TO authenticated;
