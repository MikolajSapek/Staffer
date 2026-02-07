import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { getCurrentProfile } from '@/utils/supabase/server';
import { getMarketShiftsPage } from '@/app/actions/shifts';
import JobBoardClient from '@/app/[lang]/JobBoardClient';
import { getCurrentUTCISO } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

/**
 * Market Dispatcher: Single route /market.
 * Renders WorkerMarketView | CompanyMarketView | PublicMarketView based on user role.
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

  let profile: { role?: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  const role = profile?.role as 'worker' | 'company' | 'admin' | null;

  if (role === 'worker') {
    return (
      <WorkerMarketView
        lang={lang}
        dict={dict}
        user={user!}
        supabase={supabase}
      />
    );
  }

  if (role === 'company') {
    return (
      <CompanyMarketView
        lang={lang}
        dict={dict}
        user={user!}
        supabase={supabase}
      />
    );
  }

  return (
    <PublicMarketView
      lang={lang}
      dict={dict}
      user={user}
      supabase={supabase}
    />
  );
}

/** Public: guests see offers, Apply redirects to login */
async function PublicMarketView({
  lang,
  dict,
  user,
  supabase,
}: {
  lang: string;
  dict: Awaited<ReturnType<typeof getDictionary>>;
  user: { id: string } | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const profile = user ? await getCurrentProfile() : null;
  const userRole = profile?.role as 'worker' | 'company' | 'admin' | null;
  const verificationStatus = profile?.verification_status ?? null;

  let appliedShiftIds: string[] = [];
  let applicationStatusMap: Record<string, string> = {};
  let applicationIdMap: Record<string, string> = {};

  if (user && userRole === 'worker') {
    const { data: applications } = await supabase
      .from('shift_applications')
      .select('id, shift_id, status')
      .eq('worker_id', user.id);
    const activeApplications = applications?.filter((app) => app.status !== 'cancelled') ?? [];
    appliedShiftIds = activeApplications.map((app) => app.shift_id);
    activeApplications.forEach((app) => {
      const status = app.status === 'accepted' ? 'approved' : app.status;
      applicationStatusMap[app.shift_id] = status;
      applicationIdMap[app.shift_id] = app.id;
    });
  }

  const { data: shiftsData, error: shiftsError } = await supabase
    .from('market_shifts_view')
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
      requirements,
      company_id,
      location_name,
      location_address,
      company_name,
      logo_url,
      shift_requirements (
        skill_id
      )
    `)
    .eq('status', 'published')
    .gt('start_time', getCurrentUTCISO())
    .order('start_time', { ascending: true })
    .range(0, 19);

  const mapViewToShift = (row: Record<string, unknown>) => {
    const companyName = row.company_name ?? 'Company';
    const logoUrl = row.logo_url ?? null;
    const shiftReqs = row.shift_requirements as Array<{ skill_id: string | null }> | undefined;
    const requirementsFromRel = Array.isArray(shiftReqs)
      ? shiftReqs.map((sr) => sr.skill_id).filter((id): id is string => !!id)
      : [];
    return {
      ...row,
      requirements: (requirementsFromRel.length > 0 ? requirementsFromRel : (Array.isArray(row.requirements) ? row.requirements : [])) as string[],
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
              {dict.jobBoard?.noOffersAvailable ?? dict.jobBoard?.noJobs ?? 'No offers available'}
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
          applicationIdMap={applicationIdMap}
          verificationStatus={verificationStatus}
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
}

/** Worker: sees offers, can apply, has bannedUntil check */
async function WorkerMarketView({
  lang,
  dict,
  user,
  supabase,
}: {
  lang: string;
  dict: Awaited<ReturnType<typeof getDictionary>>;
  user: { id: string };
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const profile = await getCurrentProfile();
  const userRole = profile?.role as 'worker' | 'company' | 'admin' | null;
  const verificationStatus = profile?.verification_status ?? null;

  let bannedUntil: string | null = null;
  const { data: workerDetails } = await supabase
    .from('worker_details')
    .select('banned_until')
    .eq('profile_id', user.id)
    .maybeSingle();
  bannedUntil = workerDetails?.banned_until ?? null;

  let appliedShiftIds: string[] = [];
  let applicationStatusMap: Record<string, string> = {};
  let applicationIdMap: Record<string, string> = {};

  const { data: applications } = await supabase
    .from('shift_applications')
    .select('id, shift_id, status')
    .eq('worker_id', user.id);
  const activeApplications = applications?.filter((app) => app.status !== 'cancelled') ?? [];
  appliedShiftIds = activeApplications.map((app) => app.shift_id);
  activeApplications.forEach((app) => {
    const status = app.status === 'accepted' ? 'approved' : app.status;
    applicationStatusMap[app.shift_id] = status;
    applicationIdMap[app.shift_id] = app.id;
  });

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
      ),
      shift_requirements (
        skill_id
      )
    `)
    .eq('status', 'published')
    .gt('start_time', getCurrentUTCISO())
    .order('start_time', { ascending: true });

  const availableShifts = (shiftsData || []).filter(
    (shift) => shift.vacancies_taken < shift.vacancies_total
  );
  const shifts = (shiftsError ? [] : availableShifts).map((shift) => ({
    ...shift,
    requirements: (shift.shift_requirements ?? []).map((sr: { skill_id: string | null }) => sr.skill_id).filter((id): id is string => !!id),
  }));

  return (
    <div>
      {!shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.jobBoard?.noJobs ?? 'No offers available'}
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
          applicationIdMap={applicationIdMap}
          verificationStatus={verificationStatus}
          bannedUntil={bannedUntil}
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
}

/** Company: browses marketplace (all shifts), no apply */
async function CompanyMarketView({
  lang,
  dict,
  user,
  supabase,
}: {
  lang: string;
  dict: Awaited<ReturnType<typeof getDictionary>>;
  user: { id: string };
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const profile = await getCurrentProfile();
  const userRole = profile?.role as 'worker' | 'company' | 'admin' | null;
  const verificationStatus = profile?.verification_status ?? null;

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
      ),
      shift_requirements (
        skill_id
      )
    `)
    .eq('status', 'published')
    .gt('start_time', getCurrentUTCISO())
    .order('start_time', { ascending: true });

  if (shiftsError) {
    return (
      <div className="p-8 text-red-500">
        <h2 className="text-xl font-bold mb-2">Błąd pobierania rynku</h2>
        <p>{shiftsError.message}</p>
      </div>
    );
  }

  const availableShifts = (shiftsData || []).filter(
    (shift) => shift.vacancies_taken < shift.vacancies_total
  );
  const shifts = (shiftsError ? [] : availableShifts).map((shift) => ({
    ...shift,
    requirements: (shift.shift_requirements ?? []).map((sr: { skill_id: string | null }) => sr.skill_id).filter((id): id is string => !!id),
  }));

  return (
    <div>
      {!shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.jobBoard?.noJobs ?? 'Brak aktywnych ofert na rynku.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <JobBoardClient
          shifts={shifts}
          userRole={userRole}
          user={user}
          appliedShiftIds={[]}
          applicationStatusMap={{}}
          applicationIdMap={{}}
          verificationStatus={verificationStatus}
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
}
