import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/app/[lang]/dictionaries';
import ShiftDetailsClient from './ShiftDetailsClient';

export default async function ShiftDetailsPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  // Fetch shift with approved applications and worker details
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select(`
      id,
      title,
      description,
      start_time,
      end_time,
      hourly_rate,
      break_minutes,
      is_break_paid,
      vacancies_total,
      vacancies_taken,
      status,
      category,
      location_id,
      is_urgent,
      possible_overtime,
      company_id,
      locations (
        id,
        name,
        address
      ),
      shift_applications (
        id,
        status,
        applied_at,
        worker_message,
        profiles:worker_id (
          id,
          first_name,
          last_name,
          email,
          average_rating,
          total_reviews,
          worker_details (
            avatar_url,
            phone_number
          )
        )
      )
    `)
    .eq('id', id)
    .eq('company_id', user.id)
    .single();

  if (shiftError || !shift) {
    notFound();
  }

  // Filter to only accepted applications (hired team)
  const hiredTeam = (shift.shift_applications as any[])?.filter(
    (app: any) => app.status === 'accepted'
  ) || [];

  // Fetch existing reviews for all workers in hired team if shift is completed/archived
  let reviewsMap: Record<string, { rating: number; comment: string | null; tags: string[] | null }> = {};
  if (shift.status === 'completed' || shift.status === 'cancelled') {
    const workerIds = hiredTeam.map((app: any) => app.profiles?.id).filter(Boolean);
    if (workerIds.length > 0) {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('reviewee_id, rating, comment, tags')
        .eq('shift_id', id)
        .eq('reviewer_id', user.id)
        .in('reviewee_id', workerIds);

      if (reviews) {
        reviewsMap = reviews.reduce((acc, review) => {
          acc[review.reviewee_id] = {
            rating: review.rating,
            comment: review.comment || null,
            tags: review.tags || null,
          };
          return acc;
        }, {} as Record<string, { rating: number; comment: string | null; tags: string[] | null }>);
      }
    }
  }

  // Fetch company locations for use in edit shift dialog
  const { data: locationsData } = await supabase
    .from('locations')
    .select('id, name, address')
    .eq('company_id', user.id)
    .order('name', { ascending: true });

  return (
    <ShiftDetailsClient
      shift={shift}
      hiredTeam={hiredTeam}
      reviewsMap={reviewsMap}
      lang={lang}
      dict={dict}
      locations={locationsData || []}
      createShiftDict={dict.createShift}
      shiftOptions={dict.shiftOptions}
    />
  );
}

