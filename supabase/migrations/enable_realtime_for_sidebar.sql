-- Enable Realtime for tables used by sidebar notification badges
-- Run in Supabase SQL Editor if badge counts don't update in real-time
-- See: https://supabase.com/docs/guides/realtime/postgres-changes

-- Add timesheets to Realtime publication (for instant badge update on Approve/Dispute)
ALTER PUBLICATION supabase_realtime ADD TABLE public.timesheets;

-- Add shift_applications to Realtime publication (for badge when applications change)
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_applications;
