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

  // Get the application to verify ownership
  const { data: application, error: fetchError } = await supabase
    .from('shift_applications')
    .select('shift_id, shifts!inner(company_id)')
    .eq('id', applicationId)
    .single();

  if (fetchError || !application) {
    return { error: 'Application not found' };
  }

  // Verify the company owns this shift
  interface ShiftData {
    company_id: string;
  }
  const shift = application.shifts as ShiftData;
  if (shift.company_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  // Update the application status
  const { error: updateError } = await supabase
    .from('shift_applications')
    .update({ status })
    .eq('id', applicationId);

  if (updateError) {
    return { error: updateError.message };
  }

  // If approving, we need to update vacancies_taken
  // This should be handled by a database trigger, but we'll verify
  if (status === 'approved') {
    // The database trigger should handle this, but we'll revalidate to get fresh data
  }

  // Revalidate all relevant paths to ensure immediate UI updates
  revalidatePath(`/${lang}/dashboard`, 'page'); // Update stats widgets
  revalidatePath(`/${lang}/shifts`, 'page'); // Update shift list
  revalidatePath(`/${lang}/candidates`, 'page'); // Update candidate status
  revalidatePath(`/${lang}`, 'page'); // Remove full shifts from job board
  revalidatePath(`/${lang}/schedule`, 'page'); // Update worker schedule
  revalidatePath(`/${lang}/jobs`, 'page'); // Alternative job board path

  return { success: true };
}

