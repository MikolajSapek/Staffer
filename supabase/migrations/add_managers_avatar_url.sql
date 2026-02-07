-- Add avatar_url column to managers table for profile photo support
ALTER TABLE public.managers
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
