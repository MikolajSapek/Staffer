import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { getCurrentProfile } from '@/utils/supabase/server';
import JobBoardClient from '@/app/[lang]/JobBoardClient';
import { getMarketShiftsPage } from '@/app/actions/shifts';

export const dynamic = 'force-dynamic';

/**
 * Market page: public – niezalogowani widzą oferty, Apply przekierowuje do logowania.
 * Zalogowani workerzy widzą oferty i mogą aplikować.
 */
export default async function MarketPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = user ? await getCurrentProfile() : null;
  const userRole = profile?.role as 'worker' | 'company' | 'admin' | null;
  const verificationStatus = profile?.verification_status ?? null;

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

  // Odczyt publiczny (anon): market_shifts_view – NIE filtrujemy po worker_id/auth.uid(), goście widzą tę samą listę
  const { data: shiftsData, error: shiftsError } = await supabase
    .from('market_shifts_view')
    .select('id, title, description, category, hourly_rate, start_time, end_time, break_minutes, is_break_paid, possible_overtime, vacancies_total, vacancies_taken, status, is_urgent, must_bring, requirements, company_id, location_name, location_address, company_name, logo_url')
    .eq('status', 'published')
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .range(0, 19);

  // DEBUG: przy 0 wynikach rozróżnij data === [] (sukces, brak wierszy) vs data === null (błąd/RLS)
  const dataIsEmptyArray = Array.isArray(shiftsData) && shiftsData.length === 0;
  const dataIsNull = shiftsData === null || shiftsData === undefined;
  if (shiftsError) {
    console.error('DEBUG [market market_shifts_view SELECT]:', {
      error: shiftsError,
      code: shiftsError.code,
      userId: user?.id ?? 'anon',
      dataType: dataIsNull ? 'null' : Array.isArray(shiftsData) ? 'array' : typeof shiftsData,
      dataLength: Array.isArray(shiftsData) ? shiftsData.length : 'n/a',
    });
  } else if (dataIsEmptyArray || dataIsNull) {
    console.warn('DEBUG [market market_shifts_view SELECT] 0 results:', {
      dataIsEmptyArray,
      dataIsNull,
      dataType: dataIsNull ? 'null' : (Array.isArray(shiftsData) ? 'array' : typeof shiftsData),
      dataLength: Array.isArray(shiftsData) ? shiftsData.length : 'n/a',
      userId: user?.id ?? 'anon',
      hasError: !!shiftsError,
    });
  }

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
              {dict.jobBoard?.loadErrorHint ?? 'If this persists, please try again later or contact support.'}
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
          user={user ?? null}
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
