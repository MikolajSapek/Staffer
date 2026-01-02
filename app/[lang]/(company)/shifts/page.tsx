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
      id,
      title,
      start_time,
      end_time,
      hourly_rate,
      vacancies_total,
      vacancies_taken,
      status,
      locations (
        name,
        address
      ),
      shift_applications (
        id,
        status,
        worker_id,
        profiles:worker_id (
          id,
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

  // Debug logging
  if (shiftsError) {
    console.error('Error fetching shifts:', shiftsError);
  }
  if (shifts && shifts.length > 0) {
    console.log('Shifts Sample:', JSON.stringify(shifts[0], null, 2));
    console.log('First Application:', shifts[0]?.shift_applications?.[0]);
    console.log('Worker Profile:', shifts[0]?.shift_applications?.[0]?.profiles);
  }

  return (
    <ActiveShiftsList
      shifts={shifts || []}
      dict={dict.companyShifts}
      statusDict={dict.status}
      lang={lang}
    />
  );
}

