-- ============================================
-- ADD FIRST_NAME AND LAST_NAME TO PROFILES
-- ============================================
-- Add name fields to profiles table for better display
-- For workers: both first_name and last_name are populated
-- For companies: only last_name is populated (with company name), first_name is NULL

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- ============================================
-- CREATE SMART PROFILE CREATION TRIGGER
-- ============================================
-- This trigger automatically creates a profile and detail records
-- when a new user is registered in auth.users

-- 1. Clean up old function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create the "Smart Receptionist" function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
  meta_first_name TEXT;
  meta_last_name TEXT;
  meta_company_name TEXT;
  meta_cvr_number TEXT;
BEGIN
  -- Extract data from registration metadata
  user_role := new.raw_user_meta_data->>'role';
  meta_first_name := new.raw_user_meta_data->>'first_name';
  meta_last_name := new.raw_user_meta_data->>'last_name';
  meta_company_name := new.raw_user_meta_data->>'company_name';
  meta_cvr_number := new.raw_user_meta_data->>'cvr_number';

  -- Validate role
  IF user_role NOT IN ('worker', 'company', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be worker, company, or admin', user_role;
  END IF;

  -- MAIN LOGIC: Populate PROFILES table
  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    user_role,
    -- First Name column: Only for workers
    CASE 
      WHEN user_role = 'worker' THEN meta_first_name 
      ELSE NULL -- Companies don't have first names
    END,
    -- Last Name column: Last name for workers, Company name for companies
    CASE 
      WHEN user_role = 'worker' THEN meta_last_name
      WHEN user_role = 'company' THEN meta_company_name
      ELSE 'Unknown'
    END
  );

  -- ADDITIONAL LOGIC: Detail tables
  -- If worker, create worker_details entry
  -- Note: worker_details requires many NOT NULL fields, so we insert with placeholder values
  -- These should be updated during the onboarding process
  IF user_role = 'worker' THEN
    INSERT INTO public.worker_details (
      profile_id, 
      first_name, 
      last_name,
      phone_number,
      cpr_number_encrypted,
      tax_card_type,
      bank_reg_number,
      bank_account_number
    )
    VALUES (
      new.id, 
      COALESCE(meta_first_name, ''),
      COALESCE(meta_last_name, ''),
      '', -- To be filled during onboarding
      '', -- To be filled during onboarding (then encrypted)
      'Hovedkort', -- Default tax card type
      '', -- To be filled during onboarding
      ''  -- To be filled during onboarding
    );
  END IF;

  -- If company, populate company_details (requires company_name and cvr_number)
  IF user_role = 'company' THEN
    INSERT INTO public.company_details (
      profile_id, 
      company_name, 
      cvr_number
    )
    VALUES (
      new.id, 
      COALESCE(meta_company_name, 'New Company'), 
      COALESCE(meta_cvr_number, 'PENDING-' || new.id::TEXT)
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

