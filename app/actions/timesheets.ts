'use server';

import { createClient, getCurrentProfile } from '@/utils/supabase/server';

export async function approveTimesheet(
  timesheetId: string,
  approvedStart: string,
  approvedEnd: string
) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile) {
      throw new Error('Unauthorized');
    }

    const profileData = profile as { id: string; role: string };
    if (profileData.role !== 'company' && profileData.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const supabase = await createClient();

    // Verify company owns the shift
    const { data: timesheet, error: fetchError } = await supabase
      .from('timesheets')
      .select('*, shifts!inner(company_id)')
      .eq('id', timesheetId)
      .single();

    if (fetchError || !timesheet) {
      throw new Error('Timesheet not found');
    }

    const timesheetData = timesheet as any;
    if (!timesheetData.shifts || (timesheetData.shifts.company_id !== profileData.id && profileData.role !== 'admin')) {
      throw new Error('Unauthorized');
    }

    const supabaseAny = supabase as any;
    const { error: updateError } = await supabaseAny
      .from('timesheets')
      .update({
        manager_approved_start: approvedStart,
        manager_approved_end: approvedEnd,
        status: 'approved',
      })
      .eq('id', timesheetId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markNoShow(timesheetId: string) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile) {
      throw new Error('Unauthorized');
    }

    const profileData = profile as { id: string; role: string };
    if (profileData.role !== 'company' && profileData.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const supabase = await createClient();

    // Verify company owns the shift
    const { data: timesheet, error: fetchError } = await supabase
      .from('timesheets')
      .select('*, shifts!inner(company_id)')
      .eq('id', timesheetId)
      .single();

    if (fetchError || !timesheet) {
      throw new Error('Timesheet not found');
    }

    const timesheetData = timesheet as any;
    if (!timesheetData.shifts || (timesheetData.shifts.company_id !== profileData.id && profileData.role !== 'admin')) {
      throw new Error('Unauthorized');
    }

    // Mark as no-show
    const supabaseAny = supabase as any;
    const { error: updateError } = await supabaseAny
      .from('timesheets')
      .update({
        is_no_show: true,
        status: 'disputed',
      })
      .eq('id', timesheetId);

    if (updateError) throw updateError;

    // Add strike to worker
    const workerId = timesheetData.worker_id as string;
    const { data: workerDetails } = await supabase
      .from('worker_details')
      .select('strike_count')
      .eq('profile_id', workerId)
      .single();

    if (workerDetails) {
      const workerData = workerDetails as any;
      const newStrikeCount = (workerData.strike_count || 0) + 1;

      const supabaseAny = supabase as any;
      await supabaseAny
        .from('worker_details')
        .update({ strike_count: newStrikeCount })
        .eq('profile_id', workerId);

      // Log strike
      const supabaseAny2 = supabase as any;
      await supabaseAny2
        .from('strike_history')
        .insert({
          worker_id: workerId,
          reason: 'No-show',
          issued_by: profileData.id,
        });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

