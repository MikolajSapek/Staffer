-- Update cancel_worker_application RPC: add strike_history + banned_until for worker when late cancellation
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
  v_hours_to_start NUMERIC;
  v_late_cancellation BOOLEAN := FALSE;
  v_penalty_amount NUMERIC := 0;
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

    -- Insert cancellation_fees record (company penalty)
    INSERT INTO cancellation_fees (shift_id, company_id, application_id, amount, reason)
    VALUES (v_app.shift_id, p_company_id, p_application_id, v_penalty_amount, 'Late cancellation');

    -- Insert strike_history for worker (company-initiated late cancel = worker strike + ban)
    INSERT INTO strike_history (worker_id, shift_id, reason, issued_by)
    VALUES (v_app.worker_id, v_app.shift_id, 'Late cancellation', p_company_id);

    -- Set banned_until = NOW + 30 days for worker
    UPDATE worker_details
    SET banned_until = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE profile_id = v_app.worker_id;
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
