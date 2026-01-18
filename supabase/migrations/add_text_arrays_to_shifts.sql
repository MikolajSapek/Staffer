-- Migration: Add text arrays for human-readable skill requirements
-- Date: 2026-01-18
-- Description: Add text-based columns for languages and licences to shifts table for better readability

-- ============================================
-- 1. Add text array columns to shifts table
-- ============================================

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS required_languages_text TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS required_licences_text TEXT[] DEFAULT '{}';

-- ============================================
-- 2. Add indexes for text arrays (for searching)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_shifts_required_languages_text ON shifts USING GIN (required_languages_text);
CREATE INDEX IF NOT EXISTS idx_shifts_required_licences_text ON shifts USING GIN (required_licences_text);

-- ============================================
-- 3. Add comments for documentation
-- ============================================

COMMENT ON COLUMN shifts.required_languages_text IS 
  'Human-readable array of language names (e.g., ["Danish", "English"]). Used for display and simple querying.';

COMMENT ON COLUMN shifts.required_licences_text IS 
  'Human-readable array of licence names (e.g., ["Driving License B", "Forklift License"]). Used for display and simple querying.';

COMMENT ON COLUMN shifts.required_language_ids IS 
  'Legacy UUID array - kept for compatibility. Prefer using required_languages_text.';

COMMENT ON COLUMN shifts.required_licence_ids IS 
  'Legacy UUID array - kept for compatibility. Prefer using required_licences_text.';

-- ============================================
-- 4. Verify the migration
-- ============================================

-- You can run this query separately to verify:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'shifts' 
--   AND column_name IN ('required_languages_text', 'required_licences_text')
-- ORDER BY column_name;
