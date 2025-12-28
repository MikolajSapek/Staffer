-- ============================================
-- ADD MISSING INSERT POLICY FOR PROFILES
-- ============================================
-- This allows users to create their own profile
-- when they first access the profile page

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also add INSERT policy for worker_details
-- so users can create their worker details
CREATE POLICY "Workers can insert their own details"
  ON worker_details FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Add INSERT policy for company_details
CREATE POLICY "Companies can insert their own details"
  ON company_details FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

