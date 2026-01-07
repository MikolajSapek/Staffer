import { getDictionary } from '@/app/[lang]/dictionaries';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ActiveShiftsList from './ActiveShiftsList';

export default async function ShiftsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
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

  // Get current time for filtering
  const now = new Date().toISOString();

  // Fetch only active shifts (end_time > now) with hired team data
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select(`
      *,
      location:locations!shifts_location_id_fkey(*), 
      shift_applications(
        id,
        status,
        worker:profiles!shift_applications_worker_id_fkey(
          id,
          first_name,
          last_name,
          email,
          worker_details:worker_details!worker_details_profile_id_fkey(
            avatar_url,
            phone_number
          )
        )
      )
    `)
    .eq('company_id', user.id)
    .gt('end_time', now)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });

  if (shiftsError) {
    console.error('Error fetching shifts:', shiftsError);
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
          phone_number: workerDetails?.phone_number
        } : null
      };
    });
    return {
      ...shift,
      locations: shift.location, // Map location alias to locations for backward compatibility
      applications,
    };
  });

  return (
    <ActiveShiftsList
      shifts={mappedShifts}
      dict={dict.companyShifts}
      statusDict={dict.status}
      lang={lang}
    />
  );
}

