'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

type CancelWorkerResult = {
  success: boolean;
  message: string;
  error?: string;
  lateCancellation?: boolean;
  penaltyAmount?: number;
};

type UpdateShiftResult = {
  success: boolean;
  message: string;
  error?: string;
};

type ArchiveShiftResult = {
  message?: string;
  error?: string | null;
};

/**
 * Cancel a worker's application (or assignment) for a shift.
 *
 * Wraps the `cancel_worker_application` RPC which is responsible for:
 * - Verifying that the authenticated user is the owning company
 * - Applying any business rules (late cancellation penalties, etc.)
 */
export async function cancelWorkerAction(
  applicationId: string,
  reason: string,
  path: string
): Promise<CancelWorkerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // We follow the same pattern as other company actions and redirect
    // unauthenticated users to login.
    // `path` is a full path like `/${lang}/...`, so derive lang from it if needed.
    // For now, redirect to generic login preserving language-agnostic behaviour.
    redirect('/login');
  }

  try {
    const { data, error } = await supabase.rpc('cancel_worker_application', {
      p_application_id: applicationId,
      p_cancel_reason: reason,
      p_company_id: user!.id,
    });

    if (error) {
      // Handle specific error messages from the RPC
      if (error.message.includes('Application not found') || 
          error.message.includes('not authorized')) {
        return {
          success: false,
          message: error.message,
          error: error.message,
        };
      }
      
      return {
        success: false,
        message: 'Failed to cancel worker',
        error: error.message,
      };
    }

    // The RPC returns JSONB with late_cancellation and penalty_amount
    const rpcData = data as { late_cancellation: boolean; penalty_amount: number } | null;
    
    if (!rpcData) {
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'No data returned from cancellation',
      };
    }

    const lateCancellation = rpcData.late_cancellation;
    const penaltyAmount = rpcData.penalty_amount;

    // Ensure the latest data is shown wherever this list/details live.
    revalidatePath(path);

    return {
      success: true,
      message: 'Worker has been cancelled successfully',
      lateCancellation,
      penaltyAmount,
    };
  } catch (err: any) {
    // Handle specific error messages from exceptions
    const errorMessage = err?.message ?? String(err);
    if (errorMessage.includes('Application not found') || 
        errorMessage.includes('not authorized')) {
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
    
    return {
      success: false,
      message: 'Unexpected error while cancelling worker',
      error: errorMessage,
    };
  }
}

/**
 * Update an existing shift using the `update_shift_secure` RPC.
 *
 * `formData` should already be shaped to match the RPC's argument signature;
 * this action will:
 * - Add the `p_shift_id` parameter
 * - Normalise any date values to full ISO strings with timezone.
 * - Update shift requirements in the shift_requirements table
 */
export async function updateShiftAction(
  shiftId: string,
  formData: any
): Promise<UpdateShiftResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Helper to normalise a possible Date/string field into an ISO string
    const toIsoWithTimezone = (value: unknown): string | null => {
      if (!value) return null;

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
        // Assume already ISO-like; still return string
        return value;
      }

      return null;
    };

    const startIso = toIsoWithTimezone(formData.start_time);
    const endIso = toIsoWithTimezone(formData.end_time);

    // Validate minimum shift duration (2 hours)
    if (startIso && endIso) {
      const start = new Date(startIso);
      const end = new Date(endIso);
      const diffInHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 2) {
        return {
          success: false,
          message: 'Minimum shift duration is 2 hours',
          error: 'Minimum shift duration is 2 hours',
        };
      }
    }

    // Ensure numeric values are properly converted
    const hourlyRate = typeof formData.hourly_rate === 'string' 
      ? parseFloat(formData.hourly_rate) 
      : Number(formData.hourly_rate);
    
    const vacanciesTotal = typeof formData.vacancies_total === 'string'
      ? parseInt(formData.vacancies_total, 10)
      : Number(formData.vacancies_total);
    
    const breakMinutes = typeof formData.break_minutes === 'string'
      ? parseInt(formData.break_minutes, 10)
      : Number(formData.break_minutes) || 0;

    // Update the shift via RPC
    const { error } = await supabase.rpc('update_shift_secure', {
      p_shift_id: shiftId,
      p_company_id: user.id,
      p_title: formData.title,
      p_description: formData.description ?? null,
      p_start_time: startIso,
      p_end_time: endIso,
      p_location_id: formData.location_id ?? null,
      p_hourly_rate: hourlyRate,
      p_vacancies_total: vacanciesTotal,
      p_category: formData.category,
      p_break_minutes: breakMinutes,
      p_is_break_paid: formData.is_break_paid,
      p_is_urgent: formData.is_urgent,
      p_possible_overtime: formData.possible_overtime,
    });

    if (error) {
      // Return the specific error message from the database
      // This could be messages like "Cannot change dates..." from the RPC function
      return {
        success: false,
        message: error.message || 'Failed to update shift',
        error: error.message,
      };
    }

    // Update shift requirements (languages and licenses)
    // 1. Delete existing requirements
    const { error: deleteError } = await supabase
      .from('shift_requirements')
      .delete()
      .eq('shift_id', shiftId);

    if (deleteError) {
      console.error('Error deleting old shift requirements:', deleteError);
      return {
        success: false,
        message: 'Failed to update shift requirements',
        error: deleteError.message,
      };
    }

    // 2. Insert new requirements
    const allSkillIds = [
      ...(formData.required_language_ids || []),
      ...(formData.required_licence_ids || [])
    ];

    if (allSkillIds.length > 0) {
      const requirementsToInsert = allSkillIds.map((skillId) => ({
        shift_id: shiftId,
        skill_id: skillId,
      }));

      const { error: insertError } = await supabase
        .from('shift_requirements')
        .insert(requirementsToInsert);

      if (insertError) {
        console.error('Error inserting new shift requirements:', insertError);
        return {
          success: false,
          message: 'Shift updated but failed to save requirements',
          error: insertError.message,
        };
      }
    }

    // Revalidate paths
    revalidatePath(`/shifts/${shiftId}`);
    revalidatePath('/shifts');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Shift updated successfully',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Unexpected error while updating shift',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * Archive a shift by marking it as cancelled.
 * Verifies that the authenticated user owns the shift before archiving.
 */
export async function archiveShift({
  shiftId,
  lang,
}: {
  shiftId: string;
  lang: string;
}): Promise<ArchiveShiftResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  try {
    // Verify ownership before updating
    const { data: shift, error: fetchError } = await supabase
      .from('shifts')
      .select('company_id, status')
      .eq('id', shiftId)
      .single();

    if (fetchError || !shift) {
      return { error: 'Shift not found' };
    }

    if (shift.company_id !== user.id) {
      return { error: 'Unauthorized' };
    }

    // Check if any timesheets for this shift had disputes
    const { data: timesheets, error: timesheetsError } = await supabase
      .from('timesheets')
      .select('id, was_disputed')
      .eq('shift_id', shiftId);

    if (timesheetsError) {
      console.error('Error checking timesheets for disputes:', timesheetsError);
      // Continue with archiving even if we can't check disputes
    }

    const hasResolvedDisputes = timesheets?.some((ts) => ts.was_disputed === true) ?? false;

    // Update status to cancelled (archived)
    const { error } = await supabase
      .from('shifts')
      .update({ status: 'cancelled' })
      .eq('id', shiftId)
      .eq('company_id', user.id);

    if (error) {
      return { error: error.message };
    }

    // Log to audit_logs if shift contained resolved disputes
    if (hasResolvedDisputes) {
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'archive_shift',
          table_name: 'shifts',
          record_id: shiftId,
          old_values: { status: shift.status || null },
          new_values: { 
            status: 'cancelled',
            note: 'Shift archived. Contains resolved disputes.' 
          },
        });

      if (auditError) {
        console.error('Error creating audit log:', auditError);
        // Continue even if audit log creation fails
      }
    }

    revalidatePath(`/${lang}/shifts`);
    revalidatePath(`/${lang}/shifts/${shiftId}`);
    revalidatePath(`/${lang}/dashboard`);

    return { message: 'Shift archived successfully', error: null };
  } catch (err: any) {
    return { error: err?.message ?? 'An unexpected error occurred while archiving the shift' };
  }
}


