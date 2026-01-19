-- Add manager_id column to shifts table
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL;

-- Create index on manager_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_shifts_manager_id ON public.shifts(manager_id);

-- Add comment to column
COMMENT ON COLUMN public.shifts.manager_id IS 'References the manager/contact person assigned to this shift';

-- Add manager_id column to shift_templates table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'shift_templates'
  ) THEN
    ALTER TABLE public.shift_templates
    ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_shift_templates_manager_id ON public.shift_templates(manager_id);
    
    COMMENT ON COLUMN public.shift_templates.manager_id IS 'References the manager/contact person for shifts created from this template';
  END IF;
END $$;
