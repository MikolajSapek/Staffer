'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Get notification counts for company users
 * Returns counts of: pending applicants, pending timesheets, pending payments
 */
export async function getCompanyNotificationCounts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { applicants: 0, finances: 0, timesheets: 0 };
  }

  // Get company shift IDs for timesheet count
  const { data: companyShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('company_id', user.id);
  const shiftIds = companyShifts?.map((s) => s.id) || [];

  const timesheetsPromise =
    shiftIds.length > 0
      ? supabase
          .from('timesheets')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'disputed'])
          .in('shift_id', shiftIds)
      : Promise.resolve({ count: 0 });

  const [applicantsResult, financesResult, timesheetsResult] = await Promise.all([
    supabase
      .from('shift_applications')
      .select(`
        *,
        shifts!inner(end_time)
      `, { count: 'exact', head: true })
      .eq('company_id', user.id)
      .eq('status', 'pending')
      .gte('shifts.end_time', new Date().toISOString()),

    supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', user.id)
      .eq('payment_status', 'pending'),

    timesheetsPromise,
  ]);

  return {
    applicants: applicantsResult.count || 0,
    finances: financesResult.count || 0,
    timesheets: timesheetsResult.count || 0,
  };
}
