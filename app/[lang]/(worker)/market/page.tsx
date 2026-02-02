import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { getCurrentProfile } from '@/utils/supabase/server';
import JobBoardClient from '@/app/[lang]/JobBoardClient';
import { getMarketShiftsPage } from '@/app/actions/shifts';

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

  // ZWERYFIKOWANE: market_shifts_view gwarantuje poprawne dane (requirements, location_name, location_address)
  const { data: shiftsData, error: shiftsError } = await supabase
    .from('market_shifts_view')
    .select('id, title, description, category, hourly_rate, start_time, end_time, break_minutes, is_break_paid, possible_overtime, vacancies_total, vacancies_taken, status, is_urgent, must_bring, requirements, company_id, location_name, location_address, company_name, logo_url')
    .eq('status', 'published')
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .range(0, 19);

  if (shiftsError) {
    console.error('DEBUG [market market_shifts_view SELECT]:', { error: shiftsError, code: shiftsError.code, userId: user?.id });
  }

  // Mapowanie płaskich kolumn widoku (company_name, logo_url z widoku SQL) do struktury UI
  const mapViewToShift = (row: Record<string, unknown>) => {
    const companyName = row.company_name ?? 'Company';
    const logoUrl = row.logo_url ?? null;
    return {
      ...row,
      requirements: (Array.isArray(row.requirements) ? row.requirements : []) as string[],
      locations: {
        name: row.location_name ?? '',
        address: row.location_address ?? '',
      },
      profiles: {
        company_details: {
          company_name: companyName,
          logo_url: logoUrl,
        },
      },
      company: { company_name: companyName, logo_url: logoUrl },
    };
  };

  const availableShifts = (shiftsData ?? [])
    .filter((row: Record<string, unknown>) => (row.vacancies_taken ?? 0) < (row.vacancies_total ?? 0))
    .map(mapViewToShift);
  const shifts = shiftsError ? [] : availableShifts;

  return (
    <div>
      {shiftsError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-medium">
              {dict.jobBoard?.loadError ?? 'Unable to load job offers. Please try again or contact support.'}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              {dict.jobBoard?.loadErrorHint ?? 'If this persists, check that you are logged in as a worker.'}
            </p>
          </CardContent>
        </Card>
      ) : !shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.jobBoard.noOffersAvailable ?? dict.jobBoard.noJobs ?? 'No offers available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <JobBoardClient
          shifts={shifts}
          onLoadMore={getMarketShiftsPage}
          loadMoreLabel={dict.jobBoard?.loadMore ?? 'Load more'}
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
