# 🔴 CRITICAL TIMESHEET AUDIT REPORT

**Date:** Generated from codebase analysis  
**Status:** ❌ **BROKEN - Timesheets are never created**

---

## 1. DATABASE STRUCTURE ANALYSIS

### ✅ `shifts` Table
**Columns:**
- `id` (UUID, PK)
- `company_id` (UUID, FK → profiles.id)
- `location_id` (UUID, FK → locations.id)
- `title`, `description`, `category`
- `start_time` (TIMESTAMPTZ) - **Scheduled start**
- `end_time` (TIMESTAMPTZ) - **Scheduled end**
- `hourly_rate` (NUMERIC)
- `vacancies_total`, `vacancies_taken`
- `status` - 'published', 'full', 'completed', 'cancelled'
- `created_at`, `updated_at`

**❌ MISSING COLUMNS:**
- **NO `completed_at`** - No timestamp for when shift actually completed
- **NO `actual_start_time`** - No actual clock-in time at shift level
- **NO `actual_end_time`** - No actual clock-out time at shift level

**Conclusion:** Shifts only track **scheduled** times, not **actual** work times.

---

### ✅ `shift_applications` Table
**Columns:**
- `id` (UUID, PK)
- `shift_id` (UUID, FK → shifts.id)
- `worker_id` (UUID, FK → profiles.id)
- `company_id` (UUID, FK → profiles.id)
- `status` - 'pending', 'accepted', 'rejected', 'waitlist', **'completed'**
- `applied_at` (TIMESTAMPTZ)
- `worker_message` (TEXT)
- UNIQUE(`shift_id`, `worker_id`)

**How we know who worked:**
- Workers with `status = 'accepted'` or `'completed'` worked the shift
- **BUT:** There's no direct link from `shift_applications` to `timesheets`
- The relationship is: `shift_applications` → (via `shift_id` + `worker_id`) → `timesheets`

---

### ✅ `timesheets` Table (EXISTS)
**Columns:**
- `id` (UUID, PK)
- `shift_id` (UUID, FK → shifts.id) ✅
- `worker_id` (UUID, FK → profiles.id) ✅
- `clock_in_time` (TIMESTAMPTZ, nullable)
- `clock_in_location` (TEXT, nullable)
- `clock_out_time` (TIMESTAMPTZ, nullable)
- `manager_approved_start` (TIMESTAMPTZ, nullable)
- `manager_approved_end` (TIMESTAMPTZ, nullable)
- `is_no_show` (BOOLEAN, default false)
- `status` - 'pending', 'approved', 'disputed', 'paid'
- `created_at`, `updated_at`
- UNIQUE(`shift_id`, `worker_id`)

**✅ Table structure is CORRECT** - All required columns exist.

---

### ✅ `profiles` Table
**Columns:**
- `id` (UUID, PK) - References `auth.users(id)`
- `role` - 'worker', 'company', 'admin'
- `email`, `is_verified`
- `first_name`, `last_name` (added by migration 005)
- `created_at`, `updated_at`

**How workers are linked:**
- `timesheets.worker_id` → `profiles.id` ✅
- `shift_applications.worker_id` → `profiles.id` ✅
- Relationship is correct.

---

## 2. LOGIC ANALYSIS

### ❌ **CRITICAL ISSUE #1: TIMESHEETS ARE NEVER CREATED**

**Search Results:**
- ✅ Code READS from `timesheets` table (5 locations)
- ✅ Code UPDATES `timesheets` table (4 locations)
- ❌ **Code NEVER INSERTS into `timesheets` table (0 locations)**

**Where timesheets SHOULD be created:**
1. When a shift ends (`shifts.end_time < now()`)
2. When a shift is marked as `'completed'`
3. When a worker clocks in/out (if clock-in/out feature exists)
4. Automatically for all `accepted` workers when shift ends

**Current Reality:**
- **NO database trigger** creates timesheets
- **NO application code** creates timesheets
- **NO edge function** creates timesheets
- **Result:** `timesheets` table is EMPTY → No data to display → System appears broken

---

### ✅ **DISPLAY LOGIC (Works IF timesheets exist)**

**File:** `app/[lang]/timesheets/page.tsx`

**Query:**
```typescript
const { data: timesheets } = await supabase
  .from('timesheets')
  .select(`
    id, status, worker_id,
    manager_approved_start, manager_approved_end,
    shifts!inner(id, title, start_time, end_time, hourly_rate, company_id),
    profiles:worker_id(first_name, last_name, email, worker_details(avatar_url))
  `)
  .eq('status', 'pending')
  .eq('shifts.company_id', user.id)
  .lt('shifts.end_time', now)
  .order('created_at', { ascending: false });
```

**✅ Query is CORRECT** - It properly:
- Joins with `shifts` and `profiles`
- Filters by company ownership
- Shows only pending timesheets for past shifts

**❌ Problem:** If no timesheets exist, query returns `[]` → Empty page → "No pending approvals"

---

### ✅ **PAY CALCULATION LOGIC**

**File:** `app/[lang]/(company)/timesheets/TimesheetsClient.tsx`

**Calculation:**
```typescript
const calculateHours = (timesheet: Timesheet): number => {
  const startTime = timesheet.manager_approved_start || timesheet.shifts.start_time;
  const endTime = timesheet.manager_approved_end || timesheet.shifts.end_time;
  // ... calculates hours from start/end
  return parseFloat(hours.toFixed(2));
};

const calculateTotal = (hours: number, rate: number): number => {
  return parseFloat((hours * rate).toFixed(2));
};
```

**✅ Logic is CORRECT:**
- Uses `manager_approved_start/end` if available, otherwise falls back to `shifts.start_time/end_time`
- Formula: `hours * hourly_rate = total_pay`
- Matches the calculation in `app/actions/timesheets.ts` (lines 189-203)

---

### ✅ **APPROVAL LOGIC**

**File:** `app/actions/timesheets.ts`

**Function:** `updateTimesheetStatus()`

**Flow:**
1. ✅ Fetches timesheet with shift data
2. ✅ Verifies company ownership
3. ✅ Updates timesheet status
4. ✅ If status = 'approved':
   - Calculates hours from `manager_approved_start/end` or `shift.start_time/end_time`
   - Finds `shift_applications` record (lines 206-212)
   - Creates `payments` record
   - Links payment to `application_id`

**✅ Logic is CORRECT** - But only works if timesheets exist!

---

## 3. THE "DEATH LINK" CHECK

### Foreign Key Relationships

**✅ CORRECT Relationships:**
```
timesheets.shift_id → shifts.id ✅
timesheets.worker_id → profiles.id ✅
shift_applications.shift_id → shifts.id ✅
shift_applications.worker_id → profiles.id ✅
shift_applications.company_id → profiles.id ✅
payments.application_id → shift_applications.id ✅
payments.shift_id → shifts.id ✅
payments.worker_id → profiles.id ✅
```

**❌ MISSING Direct Link:**
- `timesheets` does NOT have `application_id` column
- Relationship is indirect: `timesheets` → (via `shift_id` + `worker_id`) → `shift_applications`

**Impact:**
- In `updateTimesheetStatus()` (line 206), code must query `shift_applications` to find the `application_id`:
  ```typescript
  const { data: application } = await supabase
    .from('shift_applications')
    .select('id')
    .eq('shift_id', timesheet.shift_id)
    .eq('worker_id', timesheet.worker_id)
    .in('status', ['accepted', 'approved', 'completed'])
    .single();
  ```
- This works, but is inefficient and could fail if multiple applications exist.

---

## 4. ROOT CAUSE ANALYSIS

### Why Data Disappears / Doesn't Save

**PRIMARY CAUSE:** **Timesheets are never created in the first place.**

**Evidence:**
1. ✅ Database schema is correct
2. ✅ Display logic is correct
3. ✅ Approval logic is correct
4. ❌ **Creation logic is MISSING**

**What SHOULD happen:**
```
Shift ends (end_time < now())
  ↓
For each worker with shift_applications.status = 'accepted'
  ↓
INSERT INTO timesheets (shift_id, worker_id, status = 'pending')
  ↓
Company sees pending timesheets
  ↓
Company approves → Creates payment
```

**What ACTUALLY happens:**
```
Shift ends
  ↓
NOTHING (no trigger, no code)
  ↓
timesheets table remains empty
  ↓
Company sees "No pending approvals" (empty page)
```

---

## 5. MISSING COLUMNS / MISMATCHES

### Database vs Code Mismatches

**✅ NO MISMATCHES FOUND:**
- All columns referenced in code exist in database
- All foreign keys are correctly defined
- TypeScript types match database schema

**⚠️ POTENTIAL IMPROVEMENTS:**
1. **Add `application_id` to `timesheets` table:**
   - Would create direct link: `timesheets.application_id → shift_applications.id`
   - Would eliminate the lookup query in `updateTimesheetStatus()`
   - Would make the relationship explicit

2. **Add `rejection_reason` to `timesheets` table:**
   - Code references it (line 158 in `timesheets.ts`), but it's not in the schema
   - Currently stored as `null` or not stored at all

---

## 6. REQUIRED FIXES

### 🔴 **CRITICAL FIX #1: Create Timesheet Records**

**Option A: Database Trigger (Recommended)**
```sql
CREATE OR REPLACE FUNCTION create_timesheets_on_shift_end()
RETURNS TRIGGER AS $$
BEGIN
  -- When shift ends (end_time < now) or status = 'completed'
  IF NEW.end_time < NOW() OR NEW.status = 'completed' THEN
    -- Create timesheet for each accepted worker
    INSERT INTO timesheets (shift_id, worker_id, status)
    SELECT NEW.id, worker_id, 'pending'
    FROM shift_applications
    WHERE shift_id = NEW.id
      AND status = 'accepted'
      AND NOT EXISTS (
        SELECT 1 FROM timesheets
        WHERE shift_id = NEW.id AND worker_id = shift_applications.worker_id
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_timesheets
AFTER UPDATE ON shifts
FOR EACH ROW
WHEN (NEW.end_time < NOW() OR NEW.status = 'completed')
EXECUTE FUNCTION create_timesheets_on_shift_end();
```

**Option B: Application Code (Alternative)**
- Add function in `app/actions/shifts.ts` that runs when shift is archived/completed
- Call it from shift management UI

---

### ⚠️ **FIX #2: Add `rejection_reason` Column**

```sql
ALTER TABLE timesheets
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
```

**Update TypeScript types:**
- Add `rejection_reason?: string | null;` to `timesheets.Row`, `Insert`, `Update`

---

### 💡 **FIX #3: Add `application_id` to Timesheets (Optional but Recommended)**

```sql
ALTER TABLE timesheets
ADD COLUMN application_id UUID REFERENCES shift_applications(id);

-- Create index
CREATE INDEX idx_timesheets_application ON timesheets(application_id);
```

**Benefits:**
- Direct link to `shift_applications`
- Eliminates lookup query in `updateTimesheetStatus()`
- Makes relationship explicit

---

## 7. SUMMARY

### Current State
- ✅ Database schema: **CORRECT**
- ✅ Display logic: **CORRECT**
- ✅ Approval logic: **CORRECT**
- ❌ **Creation logic: MISSING** ← **ROOT CAUSE**

### Why It's Broken
**Timesheets are never created.** The system expects timesheet records to exist, but there's no code or trigger that creates them when shifts end or are completed.

### How to Fix
1. **Implement timesheet creation** (trigger or application code)
2. **Add `rejection_reason` column** (if needed)
3. **Optionally add `application_id`** to timesheets for direct linking

### Expected Behavior After Fix
1. Shift ends → Timesheets created for all accepted workers
2. Company sees pending timesheets in `/timesheets` page
3. Company approves → Payment created
4. System works end-to-end ✅

---

**Report Generated:** Based on complete codebase analysis  
**Files Analyzed:** 15+ files including database schema, actions, pages, and components

