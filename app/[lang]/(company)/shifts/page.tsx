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
      shift_applications (
        *,
        profiles:worker_id (
          first_name,
          last_name,
          email,
          worker_details (
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
      if (app.profiles?.worker_details) {
        // Flatten worker_details to profile level
        app.profiles.avatar_url = app.profiles.worker_details.avatar_url;
        app.profiles.phone_number = app.profiles.worker_details.phone_number;
      }
      return app;
    });
    return {
      ...shift,
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

