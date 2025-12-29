-- ============================================
-- ADD INSERT POLICY FOR COMPANY_DETAILS
-- ============================================
-- Allow companies to insert their own company_details during onboarding

CREATE POLICY "Companies can insert their own details"
  ON company_details FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

