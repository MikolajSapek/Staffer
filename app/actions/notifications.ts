'use server';

import { unstable_noStore } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUTCISO } from '@/lib/date-utils';

/**
 * Get notification counts for company users
 * Returns counts of: pending applicants, pending timesheets, pending payments
 *
 * Timesheets count: only timesheets where status IN ('pending','disputed')
 * AND there exists shift_application with status='accepted' for (shift_id, worker_id)
 * Badge hidden when count = 0
 */
export async function getCompanyNotificationCounts() {
  unstable_noStore(); // Disable cache - always fetch fresh data
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { applicants: 0, finances: 0, timesheets: 0 };
  }

  // Get company shift IDs
  const { data: companyShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('company_id', user.id);
  const shiftIds = companyShifts?.map((s) => s.id) || [];

  // Timesheets count: MUST match /timesheets page EXACTLY
  // Same logic: status pending/disputed + accepted app + shift completed + company_id
  let timesheetsCount = 0;
  if (shiftIds.length > 0) {
    const [applicationsResult, timesheetsResult] = await Promise.all([
      supabase
        .from('shift_applications')
        .select('shift_id, worker_id')
        .eq('company_id', user.id)
        .eq('status', 'accepted'),
      supabase
        .from('timesheets')
        .select(`
          shift_id,
          worker_id,
          status,
          shift:shifts!timesheets_shift_id_fkey (
            id,
            company_id,
            status,
            end_time
          )
        `)
        .in('status', ['pending', 'disputed'])
        .in('shift_id', shiftIds),
    ]);

    const acceptedKeys = new Set(
      (applicationsResult.data || []).map((a) => `${a.shift_id}:${a.worker_id}`)
    );

    const now = getCurrentUTCISO();
    timesheetsCount = (timesheetsResult.data || []).filter((t: any) => {
      const shift = Array.isArray(t.shift) ? t.shift[0] : t.shift;
      if (shift?.company_id !== user.id) return false;
      if (!acceptedKeys.has(`${t.shift_id}:${t.worker_id}`)) return false;
      const isShiftCompleted = shift?.status === 'completed' ||
        (shift?.end_time && new Date(shift.end_time) < new Date(now));
      return isShiftCompleted;
    }).length;
  }

  const [applicantsResult, financesResult] = await Promise.all([
    supabase
      .from('shift_applications')
      .select(`
        *,
        shifts!inner(end_time)
      `, { count: 'exact', head: true })
      .eq('company_id', user.id)
      .eq('status', 'pending')
      .gte('shifts.end_time', getCurrentUTCISO()),

    supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', user.id)
      .eq('payment_status', 'pending'),
  ]);

  return {
    applicants: applicantsResult.count || 0,
    finances: financesResult.count || 0,
    timesheets: timesheetsCount,
  };
}

/**
 * Get notification counts for worker users
 * Returns count of: pending payouts (payments where worker_id = user.id and payment_status = 'pending')
 */
export async function getWorkerNotificationCounts() {
  unstable_noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { finances: 0 };
  }

  const { count } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('worker_id', user.id)
    .eq('payment_status', 'pending');

  return { finances: count || 0 };
}
