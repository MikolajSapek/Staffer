-- Add notification_settings JSONB column to company_details table
-- This column stores notification preferences for company users

ALTER TABLE public.company_details 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "channels": {
    "email": true,
    "sms": false
  },
  "types": {
    "newsletter": false,
    "new_worker_applied": true,
    "offer_accepted": true,
    "pending_workdays": true,
    "pick_candidates": true,
    "rate_worker": true
  }
}'::jsonb;

-- Add comment to the column
COMMENT ON COLUMN public.company_details.notification_settings IS 'JSONB column storing notification preferences: channels (email, sms) and types (newsletter, new_worker_applied, offer_accepted, pending_workdays, pick_candidates, rate_worker)';

-- Update existing rows to have default notification settings if they don't have any
UPDATE public.company_details
SET notification_settings = '{
  "channels": {
    "email": true,
    "sms": false
  },
  "types": {
    "newsletter": false,
    "new_worker_applied": true,
    "offer_accepted": true,
    "pending_workdays": true,
    "pick_candidates": true,
    "rate_worker": true
  }
}'::jsonb
WHERE notification_settings IS NULL;
