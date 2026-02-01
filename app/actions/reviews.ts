'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

interface SubmitReviewParams {
  shiftId: string;
  workerId: string;
  rating: number;
  comment: string | null;
  tags?: string[] | null;
  lang: string;
  /** When true, skip shift status check (e.g. when called from timesheet approval flow) */
  fromTimesheet?: boolean;
}

/**
 * Submit a review for a worker after a completed shift
 */
export async function submitReview(params: SubmitReviewParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.lang}/login`);
  }

  // Validate rating
  if (params.rating < 1 || params.rating > 5) {
    return { error: 'Rating must be between 1 and 5' };
  }

  // Comment is optional, but if provided, trim it
  const commentValue = params.comment?.trim() || null;

  // Tags are optional - send null if empty or undefined
  const tagsValue = (params.tags && params.tags.length > 0) ? params.tags : null;

  // Verify the shift exists and belongs to the company
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('id, company_id, status')
    .eq('id', params.shiftId)
    .single();

  if (shiftError || !shift) {
    return { error: 'Shift not found' };
  }

  // Verify the company owns this shift
  if (shift.company_id !== user.id) {
    return { error: 'Unauthorized: You can only review workers from your own shifts' };
  }

  // Verify the shift is completed or archived (skip when from timesheet flow)
  if (!params.fromTimesheet && shift.status !== 'completed' && shift.status !== 'cancelled') {
    return { error: 'You can only review workers from completed shifts' };
  }

  // Check if review already exists
  const { data: existingReview, error: checkError } = await supabase
    .from('reviews')
    .select('id')
    .eq('shift_id', params.shiftId)
    .eq('reviewer_id', user.id)
    .eq('reviewee_id', params.workerId)
    .maybeSingle();

  if (checkError) {
    return { error: `Error checking existing review: ${checkError.message}` };
  }

  if (existingReview) {
    return { error: 'You have already reviewed this worker for this shift' };
  }

  // Verify the worker was actually hired for this shift (reviewee_id = shift_applications.worker_id)
  const { data: application, error: appError } = await supabase
    .from('shift_applications')
    .select('id, worker_id')
    .eq('shift_id', params.shiftId)
    .eq('worker_id', params.workerId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (appError) {
    return { error: `Error verifying application: ${appError.message}` };
  }

  if (!application) {
    return { error: 'This worker was not hired for this shift' };
  }

  // reviewee_id from shift_applications.worker_id (params.workerId validated above)
  const revieweeId = application.worker_id;

  // Insert the review
  const { data: review, error: insertError } = await supabase
    .from('reviews')
    .insert({
      shift_id: params.shiftId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating: params.rating,
      comment: commentValue,
      tags: tagsValue,
    })
    .select()
    .single();

  if (insertError) {
    // Handle unique constraint violation (duplicate review)
    if (insertError.code === '23505') {
      return { error: 'You have already reviewed this worker for this shift' };
    }
    return { error: `Error submitting review: ${insertError.message}` };
  }

  // Revalidate relevant paths
  revalidatePath(`/${params.lang}/shifts/${params.shiftId}`, 'page');
  revalidatePath(`/${params.lang}/shifts`, 'page');

  return { success: true, review };
}

/**
 * Get existing review for a worker on a specific shift
 */
export async function getExistingReview(shiftId: string, workerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: review, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, tags, created_at')
    .eq('shift_id', shiftId)
    .eq('reviewer_id', user.id)
    .eq('reviewee_id', workerId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  return { review };
}