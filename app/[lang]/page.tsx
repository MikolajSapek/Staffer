import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from './dictionaries';
import { getCurrentProfile } from '@/utils/supabase/server';
import LandingPageClient from '@/components/landing/LandingPageClient';
import { getCurrentUTCISO } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export default async function JobBoardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const profile = user ? await getCurrentProfile() : null;
  const userRole = profile?.role as 'worker' | 'company' | 'admin' | null;
  const verificationStatus = profile?.verification_status ?? null;

  // Logged-in company: always redirect into (company) panel so they get Sidebar layout.
  // Prevents opening root in new tab and seeing old layout instead of panel.
  if (user && userRole === 'company') {
    const { data: companyDetails } = await supabase
      .from('company_details')
      .select('profile_id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!companyDetails) {
      redirect(`/${lang}/company-setup`);
    }
    redirect(`/${lang}/dashboard`);
  }

  // Logged-in worker: redirect to market (job listings) in worker layout
  if (user && userRole === 'worker') {
    redirect(`/${lang}/market`);
  }

  // Only show landing page when no session (guest)
  if (!user) {
    const { data: shiftsData, error: shiftsError } = await supabase
      .from('shifts')
      .select(`
        id,
        title,
        description,
        category,
        hourly_rate,
        start_time,
        end_time,
        break_minutes,
        is_break_paid,
        possible_overtime,
        vacancies_total,
        vacancies_taken,
        status,
        is_urgent,
        must_bring,
        company_id,
        locations!location_id (
          name,
          address
        ),
        profiles!company_id (
          company_details!profile_id (
            company_name,
            logo_url
          )
        )
      `)
      .eq('status', 'published')
      .gt('start_time', getCurrentUTCISO())
      .order('start_time', { ascending: true })
      .limit(20);

    const availableShifts = (shiftsData || []).filter((shift: { vacancies_taken: number; vacancies_total: number }) =>
      shift.vacancies_taken < shift.vacancies_total
    );
    const shifts = shiftsError ? [] : availableShifts;

    return (
      <LandingPageClient
        shifts={shifts}
        userRole={userRole}
        user={null}
        appliedShiftIds={[]}
        applicationStatusMap={{}}
        verificationStatus={verificationStatus}
        dict={dict}
        lang={lang}
      />
    );
  }

  // Logged-in admin or unassigned role: redirect to dashboard
  redirect(`/${lang}/dashboard`);
}

