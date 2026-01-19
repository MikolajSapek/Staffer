-- Create managers table for company contact persons
CREATE TABLE IF NOT EXISTS public.managers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_managers_company_id ON public.managers(company_id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_managers_email ON public.managers(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;

-- Create policy: Companies can view their own managers
CREATE POLICY "Companies can view own managers"
  ON public.managers
  FOR SELECT
  USING (
    auth.uid() = company_id
  );

-- Create policy: Companies can insert their own managers
CREATE POLICY "Companies can insert own managers"
  ON public.managers
  FOR INSERT
  WITH CHECK (
    auth.uid() = company_id
  );

-- Create policy: Companies can update their own managers
CREATE POLICY "Companies can update own managers"
  ON public.managers
  FOR UPDATE
  USING (
    auth.uid() = company_id
  )
  WITH CHECK (
    auth.uid() = company_id
  );

-- Create policy: Companies can delete their own managers
CREATE POLICY "Companies can delete own managers"
  ON public.managers
  FOR DELETE
  USING (
    auth.uid() = company_id
  );

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_managers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_managers_updated_at
  BEFORE UPDATE ON public.managers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_managers_updated_at();

-- Add comment to table
COMMENT ON TABLE public.managers IS 'Contact persons (managers) for companies';
COMMENT ON COLUMN public.managers.company_id IS 'References the company that owns this manager';
COMMENT ON COLUMN public.managers.first_name IS 'Manager first name';
COMMENT ON COLUMN public.managers.last_name IS 'Manager last name';
COMMENT ON COLUMN public.managers.email IS 'Manager email address';
COMMENT ON COLUMN public.managers.phone_number IS 'Manager phone number (optional)';
