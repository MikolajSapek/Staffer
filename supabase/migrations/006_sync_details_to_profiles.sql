-- ============================================
-- SYNC DETAILS TABLES BACK TO PROFILES
-- ============================================
-- When worker_details or company_details are updated during onboarding,
-- automatically update the parent profiles table to keep data in sync

-- 1. Function to sync WORKER data -> PROFILES
CREATE OR REPLACE FUNCTION public.sync_worker_profile_data()
RETURNS trigger AS $$
BEGIN
  -- When worker_details is updated, sync first_name and last_name to profiles
  UPDATE public.profiles
  SET 
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    updated_at = NOW()
  WHERE id = NEW.profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to sync COMPANY data -> PROFILES
CREATE OR REPLACE FUNCTION public.sync_company_profile_data()
RETURNS trigger AS $$
BEGIN
  -- When company_details is updated, sync company_name to profiles.last_name
  -- (companies don't have first_name)
  UPDATE public.profiles
  SET 
    last_name = NEW.company_name, -- Company name goes into last_name
    first_name = NULL,             -- Companies don't have first names
    updated_at = NOW()
  WHERE id = NEW.profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Triggers (run on INSERT and UPDATE)

DROP TRIGGER IF EXISTS on_worker_details_change ON public.worker_details;
CREATE TRIGGER on_worker_details_change
  AFTER UPDATE OR INSERT ON public.worker_details
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_worker_profile_data();

DROP TRIGGER IF EXISTS on_company_details_change ON public.company_details;
CREATE TRIGGER on_company_details_change
  AFTER UPDATE OR INSERT ON public.company_details
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_company_profile_data();

