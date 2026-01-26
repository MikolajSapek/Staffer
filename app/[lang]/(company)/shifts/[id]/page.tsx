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
  // Note: This query fetches shifts regardless of status (published, completed, cancelled, etc.)
  // We fetch timesheets and payments separately to avoid issues with nested relations
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
      must_bring,
      locations (
        id,
        name,
        address
      ),
      managers!manager_id (
        first_name,
        last_name,
        phone_number,
        email
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
            phone_number,
            experience,
            description
          )
        )
      )
    `)
    .eq('id', id)
    .eq('company_id', user.id)
    .maybeSingle();

  // Only call notFound() if shift doesn't exist or user doesn't have access
  if (shiftError) {
    console.error('Error fetching shift:', shiftError);
    notFound();
  }

  if (!shift) {
    notFound();
  }

  // Fetch timesheets and payments separately to avoid relation issues
  const { data: timesheets, error: timesheetsError } = await supabase
    .from('timesheets')
    .select('id, worker_id, was_disputed, status')
    .eq('shift_id', id);

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, worker_id, metadata')
    .eq('shift_id', id);

  // Fetch shift requirements (languages and licenses)
  const { data: shiftRequirements } = await supabase
    .from('shift_requirements')
    .select(`
      skill_id,
      skills!inner (
        id,
        name,
        category
      )
    `)
    .eq('shift_id', id);

  // Group requirements by category
  const requirements = {
    languages: shiftRequirements
      ?.filter((req: any) => req.skills?.category === 'language')
      .map((req: any) => ({ id: req.skills.id, name: req.skills.name })) || [],
    licenses: shiftRequirements
      ?.filter((req: any) => req.skills?.category === 'license')
      .map((req: any) => ({ id: req.skills.id, name: req.skills.name })) || [],
  };

  // Log errors but don't block rendering - these are optional data
  if (timesheetsError) {
    console.warn('Error fetching timesheets:', timesheetsError);
  }
  if (paymentsError) {
    console.warn('Error fetching payments:', paymentsError);
  }

  // Attach timesheets and payments to shift object for compatibility
  const shiftWithRelations = {
    ...shift,
    timesheets: timesheets || [],
    payments: payments || [],
    requirements, // Add requirements to shift object
  };

  // Filter to only accepted applications (hired team)
  const hiredTeam = (shift.shift_applications as any[])?.filter(
    (app: any) => app.status === 'accepted'
  ) || [];

  // Fetch worker skills for hired team using the optimized applicant_skills_view
  let hiredTeamWithSkills = hiredTeam;
  
  if (hiredTeam.length > 0) {
    const workerIds = hiredTeam.map((app: any) => app.profiles?.id).filter(Boolean);
    
    if (workerIds.length > 0) {
      // Type definition for applicant_skills_view
      type ApplicantSkills = {
        worker_id: string;
        languages: Array<{ id: string; name: string }>;
        licenses: Array<{ id: string; name: string }>;
      };
      
      const { data: workerSkills } = await supabase
        .from('applicant_skills_view')
        .select('*')
        .in('worker_id', workerIds) as { data: ApplicantSkills[] | null; error: any };

      // Create a map of worker_id to skills
      // The view returns arrays of { id, name } objects directly - no parsing needed
      const skillsByWorker: Record<string, { 
        languages: Array<{id: string; name: string}>; 
        licenses: Array<{id: string; name: string}> 
      }> = {};

      workerSkills?.forEach((row) => {
        skillsByWorker[row.worker_id] = {
          languages: row.languages || [],
          licenses: row.licenses || []
        };
      });

      // Attach skills to each hired team application
      hiredTeamWithSkills = hiredTeam.map(app => {
        const workerId = (app as any).profiles?.id;
        return {
          ...app,
          languages: workerId ? (skillsByWorker[workerId]?.languages || []) : [],
          licenses: workerId ? (skillsByWorker[workerId]?.licenses || []) : [],
        };
      });
    }
  }

  // Fetch existing reviews for all workers in hired team if shift is completed/archived
  let reviewsMap: Record<string, { rating: number; comment: string | null; tags: string[] | null }> = {};
  if (shift.status === 'completed' || shift.status === 'cancelled') {
    const workerIds = hiredTeamWithSkills.map((app: any) => app.profiles?.id).filter(Boolean);
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

  // Build dispute information map for each worker
  // Map worker_id to payment metadata (for CorrectionBadge component)
  const disputesMap: Record<string, { 
    was_disputed: boolean; 
    metadata: {
      hours_original?: number;
      hours_final?: number;
      note?: string;
      resolution_type?: string;
    } | null;
  }> = {};
  
  if (timesheets && Array.isArray(timesheets)) {
    timesheets.forEach((timesheet: any) => {
      if (timesheet.worker_id && timesheet.was_disputed === true) {
        // Find corresponding payment for this worker to get full metadata
        const payment = (payments || [])?.find(
          (p: any) => p.worker_id === timesheet.worker_id
        );
        
        disputesMap[timesheet.worker_id] = {
          was_disputed: true,
          metadata: payment?.metadata || null,
        };
      }
    });
  }

  return (
    <ShiftDetailsClient
      shift={shiftWithRelations}
      hiredTeam={hiredTeamWithSkills}
      reviewsMap={reviewsMap}
      disputesMap={disputesMap}
      lang={lang}
      dict={dict}
      locations={locationsData || []}
      createShiftDict={dict.createShift}
      shiftOptions={dict.shiftOptions}
    />
  );
}

