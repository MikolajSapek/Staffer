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

  if (fetchError || !application) {
    return { error: 'Application not found' };
  }

  // Verify the company owns this shift
  interface ShiftData {
    company_id: string;
    start_time: string;
    end_time: string;
  }
  const shift = application.shifts as ShiftData;
  if (shift.company_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  // Map 'approved' to 'accepted' for database (database uses 'accepted')
  const dbStatus = status === 'approved' ? 'accepted' : status;

  // Update the application status
  const { error: updateError } = await supabase
    .from('shift_applications')
    .update({ status: dbStatus })
    .eq('id', applicationId);

  if (updateError) {
    return { error: updateError.message };
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
        const appShift = app.shifts as PendingShiftData;
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
  const shiftId = application.shift_id;
  
  // Dashboard - shows archived shifts and stats
  revalidatePath(`/${lang}/dashboard`, 'page');
  
  // Active Shifts page - shows active shifts with hired team
  revalidatePath(`/${lang}/shifts`, 'page');
  
  // Shift Details page - shows hired team for specific shift
  revalidatePath(`/${lang}/shifts/${shiftId}`, 'page');
  
  // Candidates page - shows application status
  revalidatePath(`/${lang}/candidates`, 'page');
  
  // Job board - remove full shifts
  revalidatePath(`/${lang}`, 'page');
  
  // Worker schedule - update worker's calendar
  revalidatePath(`/${lang}/schedule`, 'page');

  return { success: true };
}

