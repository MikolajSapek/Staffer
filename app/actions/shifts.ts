'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

interface ArchiveShiftParams {
  shiftId: string;
  lang: string;
}

/**
 * Archive a shift by updating its status to 'completed'
 */
export async function archiveShift(params: ArchiveShiftParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.lang}/login`);
  }

  // Fetch shift with all necessary data
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select(`
      id,
      company_id,
      start_time,
      end_time,
      hourly_rate,
      status
    `)
    .eq('id', params.shiftId)
    .single();

  if (shiftError || !shift) {
    return { error: 'Shift not found' };
  }

  // Verify the company owns this shift
  if (shift.company_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  // Check if shift is already archived/completed
  if (shift.status === 'completed' || shift.status === 'cancelled') {
    return { 
      success: true, 
      message: 'Shift is already archived.',
    };
  }

  // Update shift status to 'completed'
  const { error: updateError } = await (supabase as any)
    .from('shifts')
    .update({ status: 'completed' })
    .eq('id', params.shiftId);

  if (updateError) {
    return { error: `Error updating shift status: ${updateError.message}` };
  }

  // Revalidate all relevant paths
  revalidatePath(`/${params.lang}/dashboard`, 'page');
  revalidatePath(`/${params.lang}/shifts`, 'page');
  revalidatePath(`/${params.lang}/shifts/${params.shiftId}`, 'page');

  return { 
    success: true, 
    message: 'Shift archived successfully',
  };
}

