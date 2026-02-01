import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { getCurrentProfile } from '@/utils/supabase/server';
import JobBoardClient from '@/app/[lang]/JobBoardClient';

export const dynamic = 'force-dynamic';

export default async function WorkerMarketPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // Worker layout already handles authentication, but we still need user data
  if (!user) {
    redirect(`/${lang}/login`);
  }

  const profile = await getCurrentProfile();
  const userRole = profile?.role as 'worker' | 'company' | 'admin' | null;
  const verificationStatus = profile?.verification_status ?? null;

  // Ensure only workers can access this page
  if (userRole !== 'worker') {
    redirect(`/${lang}`);
  }
  
  let appliedShiftIds: string[] = [];
  let applicationStatusMap: Record<string, string> = {};

  if (user && userRole === 'worker') {
    const { data: applications } = await supabase
      .from('shift_applications')
      .select('shift_id, status')
      .eq('worker_id', user.id);
    
    appliedShiftIds = applications?.map(app => app.shift_id) || [];
    applications?.forEach(app => {
      const status = app.status === 'accepted' ? 'approved' : app.status;
      applicationStatusMap[app.shift_id] = status;
    });
  }

  // Fetch only essential shift data for worker job market (no manager data)
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
    // Using new Date().toISOString() for UTC timestamp in database queries is correct
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  // Filtrujemy tylko te zmiany, które mają wolne miejsca
  const availableShifts = (shiftsData || []).filter(shift => 
    shift.vacancies_taken < shift.vacancies_total
  );
  const shifts = shiftsError ? [] : availableShifts;

  return (
    <div>
      {!shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.jobBoard.noJobs}
            </p>
          </CardContent>
        </Card>
      ) : (
        <JobBoardClient
          shifts={shifts}
          userRole={userRole}
          user={user}
          appliedShiftIds={appliedShiftIds}
          applicationStatusMap={applicationStatusMap}
          verificationStatus={verificationStatus}
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
}
