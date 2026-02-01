import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from './dictionaries';
import { getCurrentProfile } from '@/utils/supabase/server';
import JobBoardClient from './JobBoardClient';

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

  // If a logged-in company user visits the root page and their company
  // profile is NOT completed yet, send them to company-setup.
  // Fully onboarded companies are allowed to view the public job board.
  if (user && userRole === 'company') {
    const { data: companyDetails } = await supabase
      .from('company_details')
      .select('profile_id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!companyDetails) {
      redirect(`/${lang}/company-setup`);
    }
  }

  // If a logged-in worker visits the root page, redirect to Job Listings (market) in worker layout
  if (user && userRole === 'worker') {
    redirect(`/${lang}/market`);
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

  // Fetch only essential shift data for public job board (no manager data)
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
    <div className="container mx-auto px-4 py-6">
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

