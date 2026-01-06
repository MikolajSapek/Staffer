'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

interface ApproveTimesheetParams {
  applicationId: string;
  shiftId: string;
  workerId: string;
  shiftTitle: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  workerFirstName: string | null;
  workerLastName: string | null;
  lang: string;
}

interface UpdateTimesheetStatusParams {
  timesheetId: string;
  status: 'approved' | 'disputed' | 'paid' | 'rejected';
  lang: string;
  rejectionReason?: string | null;
}

export async function approveTimesheet(params: ApproveTimesheetParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.lang}/login`);
  }

  // Verify the company owns this shift
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('company_id')
    .eq('id', params.shiftId)
    .single();

  if (shiftError || !shift) {
    return { error: 'Shift not found' };
  }

  if (shift.company_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  // Check if payment already exists for this application
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('application_id', params.applicationId)
    .single();

  if (existingPayment) {
    return { error: 'Payment already generated for this application' };
  }

  // Calculate hours worked
  const start = new Date(params.startTime);
  const end = new Date(params.endTime);
  const hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
  const totalAmount = hoursWorked * params.hourlyRate;

  // Prepare worker name snapshot
  const workerName = `${params.workerFirstName || ''} ${params.workerLastName || ''}`.trim() || 'Unknown Worker';

  // Insert payment record with currency
  const { data: payment, error: paymentError } = await (supabase as any)
    .from('payments')
    .insert({
      application_id: params.applicationId,
      shift_id: params.shiftId,
      worker_id: params.workerId,
      company_id: user.id,
      amount: totalAmount,
      hourly_rate: params.hourlyRate,
      hours_worked: parseFloat(hoursWorked.toFixed(2)),
      shift_title_snapshot: params.shiftTitle,
      worker_name_snapshot: workerName,
      status: 'pending',
      currency: 'DKK',
    })
    .select()
    .single();

  if (paymentError) {
    return { error: paymentError.message };
  }

  // Update shift_applications status to 'completed'
  const { error: updateError } = await supabase
    .from('shift_applications')
    .update({ status: 'completed' })
    .eq('id', params.applicationId);

  if (updateError) {
    // Try to rollback payment creation
    await supabase.from('payments').delete().eq('id', payment.id);
    return { error: updateError.message };
  }

  // Revalidate paths
  revalidatePath(`/${params.lang}/timesheets`, 'page');
  revalidatePath(`/${params.lang}/dashboard`, 'page');
  revalidatePath(`/${params.lang}/finances`, 'page');

  return { success: true, payment };
}

/**
 * Update timesheet status and create payment when status is changed to 'approved'
 */
export async function updateTimesheetStatus(params: UpdateTimesheetStatusParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.lang}/login`);
  }

  // Fetch timesheet with related data
  const { data: timesheet, error: timesheetError } = await supabase
    .from('timesheets')
    .select(`
      id,
      shift_id,
      worker_id,
      manager_approved_start,
      manager_approved_end,
      status,
      shifts!inner(
        id,
        title,
        hourly_rate,
        company_id,
        start_time,
        end_time
      )
    `)
    .eq('id', params.timesheetId)
    .single();

  if (timesheetError || !timesheet) {
    return { error: 'Timesheet not found' };
  }

  // Verify the company owns this shift
  if (timesheet.shifts.company_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  // Update timesheet status (and rejection_reason if provided)
  const updateData: any = { status: params.status };
  if (params.status === 'rejected' && params.rejectionReason) {
    updateData.rejection_reason = params.rejectionReason;
  }

  const { error: updateError } = await (supabase as any)
    .from('timesheets')
    .update(updateData)
    .eq('id', params.timesheetId);

  if (updateError) {
    return { error: updateError.message };
  }

  // If status is 'rejected', just revalidate (no payment creation)
  if (params.status === 'rejected') {
    revalidatePath(`/${params.lang}/timesheets`, 'page');
    revalidatePath(`/${params.lang}/finances`, 'page');
    return { success: true };
  }

  // If status is 'approved', create payment
  if (params.status === 'approved') {
    // Get worker details for name snapshot
    const { data: workerDetails } = await supabase
      .from('worker_details')
      .select('first_name, last_name')
      .eq('profile_id', timesheet.worker_id)
      .single();

    const workerName = `${workerDetails?.first_name || ''} ${workerDetails?.last_name || ''}`.trim() || 'Unknown Worker';

    // Calculate hours worked from manager_approved_start/end (as per requirements)
    // Use manager_approved_start/end if available, otherwise fall back to shift times
    const startTime = timesheet.manager_approved_start || timesheet.shifts.start_time;
    const endTime = timesheet.manager_approved_end || timesheet.shifts.end_time;

    if (!startTime || !endTime) {
      return { error: 'Approved start and end times are required' };
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
    
    // Calculate total_pay (amount) from hours * hourly_rate
    // This is the 'total_pay' value to use for payment amount
    const totalPay = hoursWorked * timesheet.shifts.hourly_rate;

    // Get application_id from shift_applications (required field)
    const { data: application } = await supabase
      .from('shift_applications')
      .select('id')
      .eq('shift_id', timesheet.shift_id)
      .eq('worker_id', timesheet.worker_id)
      .in('status', ['accepted', 'approved', 'completed'])
      .single();

    if (!application) {
      // Rollback timesheet status update
      await supabase
        .from('timesheets')
        .update({ status: timesheet.status })
        .eq('id', params.timesheetId);
      return { error: 'No application found for this timesheet. Cannot create payment without application.' };
    }

    // Check if payment already exists for this application (more accurate check)
    const { data: existingPaymentCheck } = await supabase
      .from('payments')
      .select('id')
      .eq('application_id', application.id)
      .single();

    if (existingPaymentCheck) {
      // Payment already exists, just revalidate
      revalidatePath(`/${params.lang}/timesheets`, 'page');
      revalidatePath(`/${params.lang}/finances`, 'page');
      return { success: true, payment: existingPaymentCheck };
    }

    // Insert payment record with all required fields including currency
    // amount uses total_pay calculated from timesheet (hours * hourly_rate)
    const { data: payment, error: paymentError } = await (supabase as any)
      .from('payments')
      .insert({
        application_id: application.id,
        shift_id: timesheet.shift_id,
        worker_id: timesheet.worker_id,
        company_id: user.id,
        amount: totalPay, // Use total_pay calculated from timesheet
        hourly_rate: timesheet.shifts.hourly_rate,
        hours_worked: parseFloat(hoursWorked.toFixed(2)),
        shift_title_snapshot: timesheet.shifts.title,
        worker_name_snapshot: workerName,
        status: 'pending',
        currency: 'DKK', // Explicitly set currency to avoid null constraint error
      })
      .select()
      .single();

    if (paymentError) {
      // Rollback timesheet status update
      await supabase
        .from('timesheets')
        .update({ status: timesheet.status })
        .eq('id', params.timesheetId);
      return { error: paymentError.message };
    }

    // Revalidate paths
    revalidatePath(`/${params.lang}/timesheets`, 'page');
    revalidatePath(`/${params.lang}/finances`, 'page');
    revalidatePath(`/${params.lang}/dashboard`, 'page');

    return { success: true, payment };
  }

  // Revalidate paths for other status updates
  revalidatePath(`/${params.lang}/timesheets`, 'page');
  revalidatePath(`/${params.lang}/finances`, 'page');

  return { success: true };
}

