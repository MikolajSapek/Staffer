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

  return (
    <ShiftDetailsClient
      shift={shift}
      hiredTeam={hiredTeam}
      lang={lang}
      dict={dict}
    />
  );
}

