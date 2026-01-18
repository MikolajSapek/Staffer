-- ============================================
-- Create worker_skills_display VIEW
-- Date: 2026-01-18
-- Description: Simplified view for displaying worker skills with proper RLS
-- ============================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS worker_skills_display;

-- Create view that joins worker_skills with skills for easy querying
CREATE VIEW worker_skills_display AS
SELECT 
  ws.id,
  ws.worker_id,
  ws.skill_id,
  s.name AS skill_name,
  s.category AS skill_category,
  ws.verified,
  ws.created_at
FROM worker_skills ws
INNER JOIN skills s ON s.id = ws.skill_id;

-- Enable RLS on the view
ALTER VIEW worker_skills_display SET (security_invoker = true);

-- Add comment
COMMENT ON VIEW worker_skills_display IS 
  'Simplified view joining worker_skills with skills for easy display. Companies can view skills for workers who applied to their shifts.';

-- ============================================
-- RLS Policies for the view
-- ============================================

-- Note: Views inherit RLS from underlying tables when security_invoker = true
-- worker_skills table already has RLS policies that will apply here

-- Additional policy: Companies can view skills of workers who applied to their shifts
-- This is handled by application-level logic - companies see this in CandidateProfileModal
-- when viewing applications, and the worker_id is from the application they have access to.

-- ============================================
-- Test the view
-- ============================================

-- SELECT * FROM worker_skills_display LIMIT 5;
