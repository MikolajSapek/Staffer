-- Migration: Add skill_name_debug column to worker_skills for human readability
-- Date: 2026-01-18
-- Description: Add denormalized skill name column with automatic sync via trigger

-- ============================================
-- 1. Add skill_name_debug column
-- ============================================

ALTER TABLE worker_skills 
ADD COLUMN IF NOT EXISTS skill_name_debug TEXT;

-- ============================================
-- 2. Populate existing records with skill names
-- ============================================

UPDATE worker_skills ws
SET skill_name_debug = s.name
FROM skills s
WHERE ws.skill_id = s.id
  AND ws.skill_name_debug IS NULL;

-- ============================================
-- 3. Create trigger function to auto-populate skill_name_debug
-- ============================================

CREATE OR REPLACE FUNCTION sync_worker_skill_name_debug()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT or UPDATE, automatically fetch the skill name
  SELECT name INTO NEW.skill_name_debug
  FROM skills
  WHERE id = NEW.skill_id;
  
  -- If skill not found, set to NULL
  IF NOT FOUND THEN
    NEW.skill_name_debug := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Attach trigger to worker_skills table
-- ============================================

DROP TRIGGER IF EXISTS trigger_sync_worker_skill_name_debug ON worker_skills;

CREATE TRIGGER trigger_sync_worker_skill_name_debug
  BEFORE INSERT OR UPDATE ON worker_skills
  FOR EACH ROW
  EXECUTE FUNCTION sync_worker_skill_name_debug();

-- ============================================
-- 5. Create trigger to update worker_skills when skill name changes
-- ============================================

CREATE OR REPLACE FUNCTION update_worker_skills_on_skill_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When a skill name is updated, update all worker_skills records
  UPDATE worker_skills
  SET skill_name_debug = NEW.name
  WHERE skill_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_worker_skills_on_skill_change ON skills;

CREATE TRIGGER trigger_update_worker_skills_on_skill_change
  AFTER UPDATE OF name ON skills
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION update_worker_skills_on_skill_change();

-- ============================================
-- 6. Add comments for documentation
-- ============================================

COMMENT ON COLUMN worker_skills.skill_name_debug IS 
  'Denormalized skill name for easy viewing in database. Auto-synced via trigger from skills.name.';

COMMENT ON FUNCTION sync_worker_skill_name_debug() IS 
  'Trigger function that automatically populates skill_name_debug when inserting/updating worker_skills';

COMMENT ON FUNCTION update_worker_skills_on_skill_change() IS 
  'Trigger function that updates skill_name_debug in worker_skills when a skill name changes in skills table';

-- ============================================
-- 7. Verify the migration
-- ============================================

-- You can run this query separately to verify:
-- SELECT ws.id, ws.worker_id, ws.skill_id, ws.skill_name_debug, s.name as actual_name
-- FROM worker_skills ws
-- LEFT JOIN skills s ON s.id = ws.skill_id
-- LIMIT 10;
