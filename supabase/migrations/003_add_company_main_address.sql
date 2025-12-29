-- ============================================
-- ADD MAIN_ADDRESS FIELD TO COMPANY_DETAILS
-- ============================================
-- This field stores the main company address
-- required during onboarding

ALTER TABLE company_details
ADD COLUMN IF NOT EXISTS main_address TEXT;

