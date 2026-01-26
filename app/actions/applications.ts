'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function updateApplicationStatus(
  applicationId: string,
  status: 'approved' | 'rejected',
  lang: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Get the application to verify ownership and get worker_id and shift details
  const { data: application, error: fetchError } = await supabase
    .from('shift_applications')
    .select('shift_id, worker_id, shifts!inner(company_id, start_time, end_time)')
    .eq('id', applicationId)
    .single();

  if (fetchError?.code === 'PGRST116') {
    // RLS denied access or row not visible
    return { error: 'Access denied' };
  }

  if (fetchError || !application) {
    return { error: fetchError?.message || 'Application not found' };
  }

  // Verify the company owns this shift
  interface ShiftData {
    company_id: string;
    start_time: string;
    end_time: string;
  }
  // Supabase returns joins as arrays even for 1:1 relationships
  const shift = (Array.isArray(application.shifts) ? application.shifts[0] : application.shifts) as ShiftData;
  if (shift.company_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  // Map 'approved' to 'accepted' for database (database uses 'accepted')
  const dbStatus = status === 'approved' ? 'accepted' : status;

  // If approving, use RPC to safely accept with double booking prevention
  if (status === 'approved') {
    const { error: rpcError } = await supabase.rpc('accept_application_safely', {
      p_application_id: applicationId
    });

    if (rpcError) {
      // If error contains "conflict", return a readable message for frontend
      if (rpcError.message.includes('conflict')) {
        return { error: 'This worker is already booked for another shift at this time (+/- 1h).' };
      }
      return { error: rpcError.message };
    }
  } else {
    // For rejection, use standard update
    const { error: updateError } = await supabase
      .from('shift_applications')
      .update({ status: dbStatus })
      .eq('id', applicationId);

    if (updateError) {
      return { error: updateError.message };
    }
  }

  // If approving, auto-reject overlapping pending applications from the same worker
  if (status === 'approved') {
    const approvedStartTime = new Date(shift.start_time);
    const approvedEndTime = new Date(shift.end_time);

    // Find all pending applications from the same worker
    const { data: pendingApplications, error: pendingError } = await supabase
      .from('shift_applications')
      .select('id, shift_id, shifts!inner(start_time, end_time)')
      .eq('worker_id', application.worker_id)
      .eq('status', 'pending')
      .neq('id', applicationId);

    if (!pendingError && pendingApplications) {
      // Filter applications with overlapping time windows
      const overlappingApplications = pendingApplications.filter((app) => {
        interface PendingShiftData {
          start_time: string;
          end_time: string;
        }
        // Supabase returns joins as arrays even for 1:1 relationships
        const appShift = (Array.isArray(app.shifts) ? app.shifts[0] : app.shifts) as PendingShiftData;
        const appStartTime = new Date(appShift.start_time);
        const appEndTime = new Date(appShift.end_time);

        // Check for overlap: (StartA < EndB) AND (EndA > StartB)
        return appStartTime < approvedEndTime && appEndTime > approvedStartTime;
      });

      // Bulk reject overlapping applications
      if (overlappingApplications.length > 0) {
        const overlappingIds = overlappingApplications.map((app) => app.id);
        await supabase
          .from('shift_applications')
          .update({ status: 'rejected' })
          .in('id', overlappingIds);
      }
    }
  }

  // Revalidate all relevant paths to ensure immediate UI updates
  // This ensures that workers see updated application status immediately
  // after auto-reject trigger fires (when shift becomes full)
  const shiftId = application.shift_id;
  
  // Dashboard - shows archived shifts and stats
  revalidatePath(`/${lang}/dashboard`, 'page');
  
  // Active Shifts page - shows active shifts with hired team
  revalidatePath(`/${lang}/shifts`, 'page');
  
  // Shift Details page - shows hired team for specific shift
  revalidatePath(`/${lang}/shifts/${shiftId}`, 'page');
  
  // Applicants page - shows application status
  revalidatePath(`/${lang}/applicants`, 'page');
  
  // Job board - remove full shifts (workers see updated availability)
  revalidatePath(`/${lang}`, 'page');
  
  // Worker applications page - workers see updated status (including auto-rejected)
  revalidatePath(`/${lang}/applications`, 'page');
  
  // Worker schedule - update worker's calendar
  revalidatePath(`/${lang}/schedule`, 'page');

  return { success: true };
}

/**
 * Fill available vacancies by accepting the first N pending applications for a shift
 */
export async function fillVacancies(
  shiftId: string,
  applicationIds: string[],
  lang: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Verify the company owns this shift
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('company_id, vacancies_total, vacancies_taken')
    .eq('id', shiftId)
    .single();

  if (shiftError || !shift) {
    return { error: shiftError?.message || 'Shift not found' };
  }

  if (shift.company_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  // Verify all applications belong to this shift and are pending
  const { data: applications, error: appsError } = await supabase
    .from('shift_applications')
    .select('id, status, shift_id')
    .in('id', applicationIds)
    .eq('shift_id', shiftId)
    .eq('status', 'pending');

  if (appsError) {
    return { error: appsError.message };
  }

  if (!applications || applications.length === 0) {
    return { error: 'No valid pending applications found' };
  }

  // Accept all valid applications using RPC for double booking prevention
  const validIds = applications.map(app => app.id);
  const acceptedIds: string[] = [];
  const errors: string[] = [];

  for (const appId of validIds) {
    const { error: rpcError } = await supabase.rpc('accept_application_safely', {
      p_application_id: appId
    });

    if (rpcError) {
      // If error contains "conflict", add a readable message
      if (rpcError.message.includes('conflict')) {
        errors.push(`Application ${appId}: This worker is already booked for another shift at this time (+/- 1h).`);
      } else {
        errors.push(`Application ${appId}: ${rpcError.message}`);
      }
    } else {
      acceptedIds.push(appId);
    }
  }

  // If some applications failed, return partial success with errors
  if (errors.length > 0 && acceptedIds.length === 0) {
    return { error: errors.join(' ') };
  }

  // If some succeeded but some failed, return success with warning
  if (errors.length > 0) {
    return { 
      success: true, 
      acceptedCount: acceptedIds.length,
      warning: `Some applications could not be accepted: ${errors.join(' ')}`
    };
  }

  // Revalidate paths
  revalidatePath(`/${lang}/applicants`, 'page');
  revalidatePath(`/${lang}/shifts`, 'page');
  revalidatePath(`/${lang}/shifts/${shiftId}`, 'page');
  revalidatePath(`/${lang}/dashboard`, 'page');

  return { success: true, acceptedCount: acceptedIds.length };
}

/**
 * Reject all pending applications for a shift
 */
export async function rejectAllPending(
  shiftId: string,
  lang: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Verify the company owns this shift
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('company_id')
    .eq('id', shiftId)
    .single();

  if (shiftError || !shift) {
    return { error: shiftError?.message || 'Shift not found' };
  }

  if (shift.company_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  // Reject all pending applications for this shift
  const { data: rejectedApps, error: updateError } = await supabase
    .from('shift_applications')
    .update({ status: 'rejected' })
    .eq('shift_id', shiftId)
    .eq('status', 'pending')
    .select('id');

  if (updateError) {
    return { error: updateError.message };
  }

  // Revalidate paths
  revalidatePath(`/${lang}/applicants`, 'page');
  revalidatePath(`/${lang}/shifts`, 'page');
  revalidatePath(`/${lang}/shifts/${shiftId}`, 'page');
  revalidatePath(`/${lang}/dashboard`, 'page');

  return { success: true, rejectedCount: rejectedApps?.length || 0 };
}

/**
 * Get the count of successful hires for a company (social proof)
 * Counts all shift_applications with status 'accepted' or 'completed'
 * 
 * Note: This counts total applications, not unique workers.
 * If one person worked 20 shifts, that's 20 hires.
 * 
 * Uses direct company_id field in shift_applications table for efficiency.
 */
export async function getCompanyHiresCount(companyId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('shift_applications')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .in('status', ['accepted', 'completed']);

  if (error) {
    console.error('Error fetching company hires count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Alias for getCompanyHiresCount with more descriptive name
 * Returns total number of persons hired (counting each hire separately)
 */
export async function getCompanyPersonsHiredCount(companyId: string): Promise<number> {
  return getCompanyHiresCount(companyId);
}