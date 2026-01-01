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

  // Insert payment record
  const { data: payment, error: paymentError } = await supabase
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

  return { success: true, payment };
}

