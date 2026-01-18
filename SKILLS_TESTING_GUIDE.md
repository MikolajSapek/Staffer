# Skills System - Testing Guide

## Quick Testing Steps

### 1. Test Worker Profile Form (Skills Management)

#### Setup
1. Log in as a worker account
2. Navigate to `/[lang]/profile`

#### Test Cases

**TC1: Initial Load**
- ✅ Form should load without errors
- ✅ Skills section should appear after "Additional Information"
- ✅ Should show "Loading skills..." briefly
- ✅ All 9 skills should display (grouped by Languages and Licenses)
- ✅ Previously selected skills should be checked

**TC2: Select Skills**
- ✅ Check several language checkboxes (e.g., Danish, English)
- ✅ Check several license checkboxes (e.g., Forklift, Food Handler)
- ✅ Checkboxes should respond immediately
- ✅ No console errors

**TC3: Save Skills**
- ✅ Click "Save Information"
- ✅ Button should show "Saving..."
- ✅ Success message: "Profile updated! Updating data..."
- ✅ Form should not clear selected skills
- ✅ No console errors

**TC4: Verify Persistence**
- ✅ Refresh the page (F5)
- ✅ Selected skills should still be checked
- ✅ Verify in database:
  ```sql
  SELECT ws.id, ws.worker_id, s.name, s.category
  FROM worker_skills ws
  JOIN skills s ON s.id = ws.skill_id
  WHERE ws.worker_id = '<your-user-id>';
  ```

**TC5: Deselect Skills**
- ✅ Uncheck some previously selected skills
- ✅ Click "Save Information"
- ✅ Refresh page
- ✅ Only remaining skills should be checked
- ✅ Database should reflect changes (SYNC pattern worked)

**TC6: Security Test**
- ✅ Open browser DevTools → Network tab
- ✅ Select/deselect skills and save
- ✅ Check POST request to `/rest/v1/worker_skills`
- ✅ Verify `worker_id` in payload matches your user ID
- ✅ Try to manually edit request in DevTools (should fail with RLS)

---

### 2. Test Candidate Profile Modal (Skills Display)

#### Setup
1. Log in as a company account
2. Create a shift or use existing shift
3. Have a worker apply to the shift (use worker account)
4. Worker should have skills selected in their profile

#### Test Cases

**TC1: Modal Opens**
- ✅ Navigate to `/[lang]/candidates`
- ✅ Click on a candidate application
- ✅ Modal should open smoothly
- ✅ Should show "Loading qualifications..." briefly

**TC2: Display Worker Skills**
- ✅ Languages should display as emerald badges
- ✅ Licenses should display as sky badges
- ✅ Badge colors:
  - Languages: `bg-emerald-50 text-emerald-700 border-emerald-200`
  - Licenses: `bg-sky-50 text-sky-700 border-sky-200`
- ✅ Skills should match worker's selected skills

**TC3: Empty State**
- ✅ View a candidate with no skills
- ✅ Should show "No specific qualifications listed"
- ✅ Should NOT show "Loading..." forever
- ✅ Should NOT flash empty → loading → empty

**TC4: No Hydration Warnings**
- ✅ Open browser console
- ✅ Open/close modal multiple times
- ✅ Should see NO hydration warnings
- ✅ Should see NO React errors

**TC5: Data Accuracy**
- ✅ Verify in database:
  ```sql
  SELECT p.first_name, p.last_name, s.name as skill_name, s.category
  FROM worker_skills ws
  JOIN skills s ON s.id = ws.skill_id
  JOIN profiles p ON p.id = ws.worker_id
  WHERE ws.worker_id = '<worker-user-id>';
  ```
- ✅ Modal display should match database records

---

### 3. Integration Tests

#### Test Workflow: End-to-End
1. **Worker adds skills**
   - ✅ Worker logs in
   - ✅ Goes to profile
   - ✅ Selects: Danish, English (languages) + Forklift (license)
   - ✅ Saves profile
   - ✅ Logs out

2. **Worker applies to shift**
   - ✅ Worker logs in
   - ✅ Browses job board
   - ✅ Applies to a shift
   - ✅ Logs out

3. **Company views application**
   - ✅ Company logs in
   - ✅ Goes to Candidates page
   - ✅ Opens worker's application
   - ✅ Sees emerald badges: "Danish", "English"
   - ✅ Sees sky badge: "Forklift"
   - ✅ Skills match what worker selected

#### Test Workflow: Skills Update
1. **Worker updates skills**
   - ✅ Worker removes "English"
   - ✅ Adds "Food Handler Certificate"
   - ✅ Saves profile

2. **Company views updated profile**
   - ✅ Company refreshes Candidates page
   - ✅ Opens same worker's application
   - ✅ Should now show: Danish (language), Forklift + Food Handler (licenses)
   - ✅ "English" should be gone

---

### 4. Edge Cases

#### EC1: No Skills Selected
- ✅ Worker saves profile with no skills checked
- ✅ Database should have zero records in `worker_skills` for that worker
- ✅ Modal should show "No qualifications listed"

#### EC2: All Skills Selected
- ✅ Worker checks all 9 skills
- ✅ Saves successfully
- ✅ Database should have 9 records
- ✅ Modal should display all 9 badges

#### EC3: Rapid Toggle
- ✅ Quickly check/uncheck multiple skills
- ✅ Save immediately
- ✅ State should be consistent
- ✅ No race conditions

#### EC4: Network Error
- ✅ Open DevTools → Network tab
- ✅ Set throttling to "Offline"
- ✅ Try to save skills
- ✅ Should show error message
- ✅ Should not corrupt form state

---

### 5. Performance Tests

#### P1: Initial Load Time
- ✅ Profile page should load in < 2 seconds
- ✅ Skills fetch should be < 500ms
- ✅ No unnecessary re-renders

#### P2: Save Performance
- ✅ SYNC pattern (DELETE + INSERT) should be < 1 second
- ✅ Check Network tab for query count
- ✅ Should see exactly 2 queries (DELETE, INSERT)

#### P3: Modal Open Performance
- ✅ Modal should open in < 500ms
- ✅ Skills fetch should not block UI
- ✅ Loading spinner should show for < 1 second

---

### 6. Database Verification Queries

```sql
-- Check all skills in catalog
SELECT * FROM skills ORDER BY category, name;
-- Expected: 9 rows

-- Check worker's skills
SELECT 
  ws.id,
  ws.worker_id,
  s.name as skill_name,
  s.category,
  ws.verified,
  ws.created_at
FROM worker_skills ws
JOIN skills s ON s.id = ws.skill_id
WHERE ws.worker_id = '<worker-user-id>';

-- Check skill_name_debug is auto-populated
SELECT id, skill_id, skill_name_debug 
FROM worker_skills 
WHERE skill_name_debug IS NULL;
-- Expected: 0 rows (all should have skill_name_debug)

-- Check for duplicate skills (should be prevented by UNIQUE constraint)
SELECT worker_id, skill_id, COUNT(*) 
FROM worker_skills 
GROUP BY worker_id, skill_id 
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

---

### 7. Security Verification

#### S1: RLS Policy Check
```sql
-- As worker, try to view other workers' skills (should fail or return empty)
SELECT * FROM worker_skills WHERE worker_id != '<your-user-id>';

-- As worker, try to insert skill for another worker (should fail)
INSERT INTO worker_skills (worker_id, skill_id) 
VALUES ('<other-user-id>', '<some-skill-id>');
-- Expected: RLS policy violation
```

#### S2: Client-Side Tampering
- ✅ Open DevTools → Console
- ✅ Try to modify form state:
  ```javascript
  // This should not allow saving skills for another user
  fetch('/rest/v1/worker_skills', {
    method: 'POST',
    body: JSON.stringify({
      worker_id: 'other-user-id',
      skill_id: 'some-skill-id'
    })
  });
  ```
- ✅ Should fail with RLS error

---

## Automated Test Script (Optional)

If using Playwright or Cypress:

```typescript
test('Worker can select and save skills', async ({ page }) => {
  // Login as worker
  await page.goto('/en/login');
  await page.fill('[name="email"]', 'worker@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to profile
  await page.goto('/en/profile');
  
  // Wait for skills to load
  await page.waitForSelector('text=Languages');
  
  // Select Danish and English
  await page.check('input[type="checkbox"][value*="danish"]');
  await page.check('input[type="checkbox"][value*="english"]');
  
  // Save
  await page.click('button:has-text("Save Information")');
  
  // Wait for success message
  await page.waitForSelector('text=Profile updated');
  
  // Refresh and verify
  await page.reload();
  expect(await page.isChecked('input[value*="danish"]')).toBeTruthy();
  expect(await page.isChecked('input[value*="english"]')).toBeTruthy();
});
```

---

## Rollback Plan

If issues are found in production:

1. **Immediate Rollback**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Database Rollback** (if needed)
   ```sql
   -- Re-add legacy columns (temporary)
   ALTER TABLE profiles ADD COLUMN languages TEXT[];
   ALTER TABLE profiles ADD COLUMN licences TEXT[];
   
   -- Populate from worker_skills
   UPDATE profiles p
   SET languages = (
     SELECT ARRAY_AGG(s.name)
     FROM worker_skills ws
     JOIN skills s ON s.id = ws.skill_id
     WHERE ws.worker_id = p.id AND s.category = 'language'
   );
   ```

3. **Monitor**
   - Check error logs
   - Monitor Sentry/logging
   - Watch user support tickets

---

## Success Criteria

✅ All test cases pass  
✅ No console errors or warnings  
✅ No hydration warnings  
✅ Skills persist correctly  
✅ SYNC pattern works (DELETE + INSERT)  
✅ Security: RLS policies enforced  
✅ Performance: Load time < 2s  
✅ UX: Loading spinners prevent flashes  
✅ Database: No duplicate skills  
✅ Database: skill_name_debug auto-populated  

---

## Deployment Checklist

Before deploying to production:

- [ ] All test cases passed
- [ ] Database migration applied
- [ ] Skills catalog populated (9 records)
- [ ] RLS policies verified
- [ ] Performance tested
- [ ] Security audited
- [ ] Documentation updated
- [ ] Rollback plan ready
- [ ] Monitoring configured
- [ ] Team notified

---

**Happy Testing! 🚀**
