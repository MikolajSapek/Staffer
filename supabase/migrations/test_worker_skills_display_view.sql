-- ============================================
-- Test worker_skills_display View
-- Run this to verify the view is working correctly
-- ============================================

-- TEST 1: Check if view exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_views
      WHERE schemaname = 'public'
      AND viewname = 'worker_skills_display'
    ) THEN '✅ VIEW EXISTS'
    ELSE '❌ VIEW MISSING - Run migration!'
  END AS view_status;

-- TEST 2: View structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'worker_skills_display'
ORDER BY ordinal_position;

-- Expected columns:
-- id, worker_id, skill_id, skill_name, skill_category, verified, created_at

-- TEST 3: Sample data from view
SELECT 
  worker_id,
  skill_name,
  skill_category,
  verified
FROM worker_skills_display
LIMIT 10;

-- TEST 4: Count by category
SELECT 
  skill_category,
  COUNT(*) as count,
  COUNT(DISTINCT worker_id) as unique_workers
FROM worker_skills_display
GROUP BY skill_category;

-- TEST 5: Test specific worker (replace with actual worker_id)
-- This is what the modal will run:
SELECT *
FROM worker_skills_display
WHERE worker_id = '<replace-with-worker-id>'
ORDER BY skill_category, skill_name;

-- TEST 6: Verify JOIN is working correctly
-- Compare view results with manual JOIN
SELECT 
  ws.id,
  ws.worker_id,
  s.name AS skill_name,
  s.category AS skill_category
FROM worker_skills ws
JOIN skills s ON s.id = ws.skill_id
LIMIT 5;

-- Should match worker_skills_display output

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- TEST 1: ✅ VIEW EXISTS
-- TEST 2: 7 columns (id, worker_id, skill_id, skill_name, skill_category, verified, created_at)
-- TEST 3: Rows with readable skill names and categories
-- TEST 4: Count split by 'language' and 'license'
-- TEST 5: All skills for a specific worker
-- TEST 6: Matching data between view and manual JOIN
