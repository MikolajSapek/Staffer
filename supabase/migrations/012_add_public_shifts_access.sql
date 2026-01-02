-- ============================================
-- MIGRATION: Add public read access to shifts
-- ============================================
-- This migration adds a policy that allows unauthenticated users
-- to view published shifts, making the job board publicly accessible.

CREATE POLICY "Public can view published shifts"
  ON shifts FOR SELECT
  USING (status = 'published');

-- Also add public access to locations for published shifts
CREATE POLICY "Public can view published locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.location_id = locations.id
      AND shifts.status = 'published'
    )
  );

