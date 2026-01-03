-- Add worker_message field to shift_applications table
ALTER TABLE shift_applications
ADD COLUMN IF NOT EXISTS worker_message TEXT;


