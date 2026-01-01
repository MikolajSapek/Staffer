-- ============================================
-- FUNCTION: Update vacancies_taken when application status changes
-- ============================================
-- This trigger automatically updates vacancies_taken when:
-- - An application is approved/accepted (increment)
-- - An application is rejected/cancelled (decrement if it was previously approved/accepted)
-- - An application status changes from approved/accepted to rejected (decrement)

CREATE OR REPLACE FUNCTION update_vacancies_on_application_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT: If new application is approved or accepted, increment
  IF TG_OP = 'INSERT' AND (NEW.status = 'approved' OR NEW.status = 'accepted') THEN
    UPDATE shifts
    SET vacancies_taken = COALESCE(vacancies_taken, 0) + 1
    WHERE id = NEW.shift_id;
    RETURN NEW;
  END IF;

  -- Handle UPDATE: Check status changes
  IF TG_OP = 'UPDATE' THEN
    -- If status changed to 'approved' or 'accepted', increment
    IF (NEW.status = 'approved' OR NEW.status = 'accepted') 
       AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'accepted')) THEN
      UPDATE shifts
      SET vacancies_taken = COALESCE(vacancies_taken, 0) + 1
      WHERE id = NEW.shift_id;
    END IF;

    -- If status changed from 'approved' or 'accepted' to something else, decrement
    IF (OLD.status = 'approved' OR OLD.status = 'accepted') 
       AND (NEW.status != 'approved' AND NEW.status != 'accepted') THEN
      UPDATE shifts
      SET vacancies_taken = GREATEST(COALESCE(vacancies_taken, 0) - 1, 0)
      WHERE id = NEW.shift_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_vacancies_on_application_change_trigger ON shift_applications;
CREATE TRIGGER update_vacancies_on_application_change_trigger
  AFTER INSERT OR UPDATE OF status ON shift_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_vacancies_on_application_change();

