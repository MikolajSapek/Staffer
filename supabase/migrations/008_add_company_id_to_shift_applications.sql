-- Add company_id field to shift_applications table
-- This allows direct access to company_id without joining through shifts
ALTER TABLE shift_applications
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update existing records to populate company_id from shifts
UPDATE shift_applications
SET company_id = (
  SELECT company_id 
  FROM shifts 
  WHERE shifts.id = shift_applications.shift_id
)
WHERE company_id IS NULL;

-- Make company_id NOT NULL after populating existing data
ALTER TABLE shift_applications
ALTER COLUMN company_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_shift_applications_company ON shift_applications(company_id);

