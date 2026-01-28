import { getDictionary } from '@/app/[lang]/dictionaries';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ActiveShiftsList from './ActiveShiftsList';

export const dynamic = 'force-dynamic';

export default async function ShiftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { lang } = await params;
  const { status } = await searchParams;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  // Upewnij się, że stare zmiany są oznaczone jako completed
  await supabase.rpc('update_completed_shifts');

  // Get current time for filtering (UTC for database queries)
  const now = new Date().toISOString();

  // Determine if showing archive or active shifts
  const isArchive = status === 'completed';

  // Fetch shifts based on view type
  let shiftsQuery = supabase
    .from('shifts')
    .select(`
      *,
      location:locations!shifts_location_id_fkey(*),
      managers!manager_id(
        first_name,
        last_name,
        phone_number
      ),
      shift_applications(
        id,
        status,
        worker:profiles!shift_applications_worker_id_fkey(
          id,
          first_name,
          last_name,
          email,
          average_rating,
          total_reviews,
          worker_details:worker_details!worker_details_profile_id_fkey(
            avatar_url,
            phone_number
          )
        )
      )
    `)
    .eq('company_id', user.id);

  if (isArchive) {
    // Archive: completed or cancelled shifts, sorted by end_time descending (most recent first)
    shiftsQuery = shiftsQuery
      .or('status.eq.cancelled,status.eq.completed')
      .order('end_time', { ascending: false });
  } else {
    // Active: future shifts (end_time >= now) that aren't cancelled
    shiftsQuery = shiftsQuery
      .gte('end_time', now)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });
  }

  const { data: shifts, error: shiftsError } = await shiftsQuery;

  if (shiftsError) {
    console.error('Error fetching shifts:', shiftsError);
  }

  // Fetch company locations for use in edit shift form/dialog
  const { data: locationsData, error: locationsError } = await supabase
    .from('locations')
    .select('*')
    .eq('company_id', user.id)
    .order('name', { ascending: true });

  if (locationsError) {
    console.error('Error fetching locations for shifts page:', locationsError);
  }

  // Fetch shift requirements for all shifts
  const shiftIds = (shifts || []).map((s: any) => s.id);
  let shiftRequirementsMap: Record<string, { language_ids: string[]; licence_ids: string[] }> = {};
  
  if (shiftIds.length > 0) {
    const { data: shiftRequirements } = await supabase
      .from('shift_requirements')
      .select(`
        shift_id,
        skill_id,
        skills!inner (
          id,
          category
        )
      `)
      .in('shift_id', shiftIds);

    // Group requirements by shift_id and category
    shiftRequirements?.forEach((req: any) => {
      if (!shiftRequirementsMap[req.shift_id]) {
        shiftRequirementsMap[req.shift_id] = { language_ids: [], licence_ids: [] };
      }
      if (req.skills?.category === 'language') {
        shiftRequirementsMap[req.shift_id].language_ids.push(req.skills.id);
      } else if (req.skills?.category === 'license') {
        shiftRequirementsMap[req.shift_id].licence_ids.push(req.skills.id);
      }
    });
  }

  // Map worker_details data to profile level and rename shift_applications to applications
  const mappedShifts = (shifts || []).map((shift: any) => {
    const applications = (shift.shift_applications || []).map((app: any) => {
      const worker = app.worker;
      const workerDetails = worker?.worker_details;
      return {
        ...app,
        profiles: worker ? {
          ...worker,
          avatar_url: workerDetails?.avatar_url,
          phone_number: workerDetails?.phone_number,
          average_rating: worker.average_rating,
          total_reviews: worker.total_reviews
        } : null
      };
    });
    const requirements = shiftRequirementsMap[shift.id] || { language_ids: [], licence_ids: [] };
    return {
      ...shift,
      locations: shift.location, // Map location alias to locations for backward compatibility
      applications,
      required_language_ids: requirements.language_ids,
      required_licence_ids: requirements.licence_ids,
    };
  });

  // Override title and description based on view
  const pageDict = {
    ...dict.companyShifts,
    title: isArchive ? dict.companyShifts.archiveTitle : dict.companyShifts.title,
    description: isArchive 
      ? dict.companyShifts.archiveDescription
      : dict.companyShifts.description,
    activeShifts: isArchive ? dict.companyShifts.archiveShifts : dict.companyShifts.activeShifts,
  };

  return (
    <ActiveShiftsList
      shifts={mappedShifts}
      dict={pageDict}
      statusDict={dict.status}
      lang={lang}
      locations={locationsData || []}
      createShiftDict={dict.createShift}
      shiftOptions={dict.shiftOptions}
      isArchive={isArchive}
    />
  );
}

