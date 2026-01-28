'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Approve a timesheet with idempotency protection against duplicate payments.
 * 
 * This function prevents "Double Submit" errors by checking if a payment
 * already exists for the timesheet's application_id before creating a new one.
 * 
 * If a payment already exists, it will only update the timesheet status to 'approved'
 * without creating a duplicate payment record.
 */
export async function approveTimesheet(timesheetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  try {
    // 1. Get the timesheet with shift and worker information
    const { data: timesheet, error: timesheetError } = await supabase
      .from('timesheets')
      .select('id, shift_id, worker_id, company_id, status')
      .eq('id', timesheetId)
      .single();

    if (timesheetError || !timesheet) {
      return {
        success: false,
        error: timesheetError?.message || 'Timesheet not found',
      };
    }

    if (!timesheet.shift_id || !timesheet.worker_id) {
      return {
        success: false,
        error: 'Timesheet missing required shift_id or worker_id',
      };
    }

    // 2. Find the application_id from shift_applications table
    const { data: application, error: applicationError } = await supabase
      .from('shift_applications')
      .select('id')
      .eq('shift_id', timesheet.shift_id)
      .eq('worker_id', timesheet.worker_id)
      .single();

    if (applicationError || !application) {
      return {
        success: false,
        error: applicationError?.message || 'Application not found for this timesheet',
      };
    }

    const applicationId = application.id;

    // 3. Check if payment already exists for this application_id
    // Use limit(1) to handle cases where duplicates might exist due to the bug
    const { data: existingPayments, error: paymentCheckError } = await supabase
      .from('payments')
      .select('id')
      .eq('application_id', applicationId)
      .limit(1);

    if (paymentCheckError) {
      return {
        success: false,
        error: `Error checking for existing payment: ${paymentCheckError.message}`,
      };
    }

    // 4. If payment already exists, only update timesheet status (skip payment creation)
    if (existingPayments && existingPayments.length > 0) {
      console.log('Payment already exists for application:', applicationId, '- skipping duplicate payment creation');
      
      // Update timesheet status to 'approved' without creating duplicate payment
      const { error: updateError } = await supabase
        .from('timesheets')
        .update({ status: 'approved' })
        .eq('id', timesheetId);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update timesheet status: ${updateError.message}`,
        };
      }

      return {
        success: true,
        message: 'Timesheet approved (payment already exists)',
        skippedPayment: true,
      };
    }

    // 5. If payment doesn't exist, call the RPC function which will create payment and approve timesheet
    const { error: rpcError } = await supabase.rpc('approve_timesheet', {
      timesheet_id_input: timesheetId,
    });

    if (rpcError) {
      return {
        success: false,
        error: rpcError.message || 'Failed to approve timesheet',
      };
    }

    return {
      success: true,
      message: 'Timesheet approved and payment created',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred',
    };
  }
}

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
  // UTC timestamp for database queries
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
