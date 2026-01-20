'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Fetch COMPLETED timesheets for a worker with full shift and company details
 * 
 * CRITICAL FILTERS:
 * - Only shows shifts that have already STARTED (no future shifts)
 * - Excludes cancelled/rejected timesheets
 * - Sorted by shift date (newest first)
 * 
 * Database relationship: shifts.company_id -> profiles.id -> company_details.profile_id
 */
export async function getWorkerTimesheets(workerId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: timesheets, error } = await supabase
    .from('timesheets')
    .select(`
      *,
      shifts!inner(
        id,
        title,
        start_time,
        end_time,
        hourly_rate,
        break_minutes,
        is_break_paid,
        company_id,
        profiles(
          company_details(company_name)
        )
      )
    `)
    .eq('worker_id', workerId)
    // Only shifts that have already started (no future dates)
    .lt('shifts.start_time', now)
    // Exclude cancelled timesheets (shouldn't count toward earnings)
    .neq('status', 'cancelled');

  if (error) {
    console.error('Error fetching timesheets:', error);
    return { data: null, error };
  }

  // Transform data to flatten company_name for easier frontend access
  // Also sort by shift start_time (newest first) - Supabase doesn't support ordering by foreign table fields directly
  const mappedData = (timesheets || [])
    .map(ts => {
      const shift = Array.isArray(ts.shifts) ? ts.shifts[0] : ts.shifts;
      const companyDetails = Array.isArray(shift?.profiles?.company_details) 
        ? shift.profiles.company_details[0] 
        : shift?.profiles?.company_details;

      return {
        ...ts,
        shifts: shift ? {
          id: shift.id,
          title: shift.title,
          start_time: shift.start_time,
          end_time: shift.end_time,
          hourly_rate: shift.hourly_rate,
          break_minutes: shift.break_minutes,
          is_break_paid: shift.is_break_paid,
          company_id: shift.company_id,
          company_name: companyDetails?.company_name || 'Unknown Company',
        } : null,
      };
    })
    // Sort by shift start time DESC (newest first)
    .sort((a, b) => {
      const dateA = a.shifts?.start_time ? new Date(a.shifts.start_time).getTime() : 0;
      const dateB = b.shifts?.start_time ? new Date(b.shifts.start_time).getTime() : 0;
      return dateB - dateA; // DESC order
    });

  return { data: mappedData, error: null };
}
