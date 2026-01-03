-- ============================================
-- AUTO-ARCHIVE EXPIRED SHIFTS
-- ============================================
-- This migration creates a function to automatically archive shifts
-- that have passed their end_time and are still marked as 'published'

-- Function to handle expired shifts
CREATE OR REPLACE FUNCTION handle_expired_shifts()
RETURNS void AS $$
BEGIN
  UPDATE shifts
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE 
    end_time < NOW()
    AND status = 'published';
END;
$$ LANGUAGE plpgsql;

-- Add index on end_time for better performance of the query
CREATE INDEX IF NOT EXISTS idx_shifts_end_time ON shifts(end_time);

-- Grant execute permission to authenticated users (if needed)
-- GRANT EXECUTE ON FUNCTION handle_expired_shifts() TO authenticated;

-- ============================================
-- OPTIONAL: Configure pg_cron for automatic execution
-- ============================================
-- Note: pg_cron extension availability depends on your Supabase plan
-- For self-hosted Supabase or plans with pg_cron support, uncomment below:

-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 15 minutes
-- SELECT cron.schedule(
--   'archive-shifts-job',           -- job name
--   '*/15 * * * *',                 -- cron expression: every 15 minutes
--   'SELECT handle_expired_shifts()' -- SQL to execute
-- );

-- To unschedule the job later (if needed):
-- SELECT cron.unschedule('archive-shifts-job');

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

