import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { getCompanyNotificationCounts } from '@/app/actions/notifications';
import Link from 'next/link';
import {
  Users,
  MapPin,
  Copy,
  UserCog,
  Plus,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ShiftsTabs from '@/components/dashboard/ShiftsTabs';
import { getListingsActivePage, getListingsArchivedPage } from '@/app/actions/shifts';

export const dynamic = 'force-dynamic';

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentLang = lang || 'en-US';
  const dict = await getDictionary(currentLang as 'en-US' | 'da');
  const counts = await getCompanyNotificationCounts();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const nav = dict.nav as Record<string, string> | undefined;
  const dashboardDict = (dict as any).dashboard;

  // Fetch active and archived shifts for ShiftsTabs (all use authenticated role via createClient)
  const now = new Date().toISOString();
  const { error: updateCompletedError } = await supabase.rpc('update_completed_shifts');
  if (updateCompletedError) {
    console.error('DEBUG [update_completed_shifts RPC]:', { error: updateCompletedError, userId: user?.id });
  }

  const { data: activeShifts, error: activeError } = await supabase
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
          worker_details:worker_details!worker_details_profile_id_fkey(avatar_url)
        )
      )
    `)
    .eq('company_id', user.id)
    .gte('end_time', now)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })
    .range(0, 19);

  if (activeError) {
    console.error('DEBUG [shifts SELECT active]:', { error: activeError, code: activeError.code, data: activeShifts, userId: user?.id });
  }

  const { data: pastShifts, error: pastError } = await supabase
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
          worker_details:worker_details!worker_details_profile_id_fkey(avatar_url)
        )
      )
    `)
    .eq('company_id', user.id)
    .lt('end_time', now)
    .order('start_time', { ascending: false })
    .range(0, 19);

  if (pastError) {
    console.error('DEBUG [shifts SELECT past]:', { error: pastError, code: pastError.code, data: pastShifts, userId: user?.id });
  }

  const { data: statusShifts, error: statusError } = await supabase
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
          worker_details:worker_details!worker_details_profile_id_fkey(avatar_url)
        )
      )
    `)
    .eq('company_id', user.id)
    .in('status', ['completed', 'cancelled'])
    .order('start_time', { ascending: false })
    .range(0, 19);

  if (statusError) {
    console.error('DEBUG [shifts SELECT status]:', { error: statusError, code: statusError.code, data: statusShifts, userId: user?.id });
  }

  console.log('DATA CHECK [Dashboard]:', { activeCount: activeShifts?.length ?? 0, pastCount: pastShifts?.length ?? 0, statusCount: statusShifts?.length ?? 0, userId: user?.id, hasActiveError: !!activeError, hasPastError: !!pastError, hasStatusError: !!statusError });

  // Zabezpieczenie: data null → pusta tablica (unika błędu .map na null)
  const allArchivedShifts = [...(pastShifts ?? []), ...(statusShifts ?? [])];
  const uniqueArchivedShifts = Array.from(
    new Map((allArchivedShifts ?? []).map((s) => [s.id, s])).values()
  ).slice(0, 20);

  const mapShifts = (shifts: any[]) =>
    (shifts ?? []).map((shift) => ({
      ...shift,
      locations: shift.location,
      shift_applications: (shift.shift_applications || []).map((app: any) => {
        const worker = app.worker;
        const workerDetails = Array.isArray(worker?.worker_details)
          ? worker.worker_details[0]
          : worker?.worker_details;
        return {
          ...app,
          status: app.status,
          profiles: worker
            ? {
                id: worker.id,
                first_name: worker.first_name,
                last_name: worker.last_name,
                worker_details: workerDetails
                  ? { avatar_url: workerDetails.avatar_url }
                  : null,
              }
            : null,
        };
      }),
    }));

  const mappedActiveShifts = mapShifts(activeShifts ?? []);
  const mappedArchivedShifts = mapShifts(uniqueArchivedShifts);

  const tools = [
    { name: dashboardDict?.locations || nav?.locations || 'Locations', href: `/${currentLang}/locations`, icon: MapPin },
    { name: dashboardDict?.templates || 'Templates', href: `/${currentLang}/templates`, icon: Copy },
    { name: dashboardDict?.team || 'Team', href: `/${currentLang}/managers`, icon: UserCog },
    { name: 'Staff', href: `/${currentLang}/staff`, icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Create button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {nav?.dashboard || 'Dashboard'}
            </h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              {dashboardDict?.welcomeSubtitle || 'Here is your company overview.'}
            </p>
          </div>
          <Link href={`/${currentLang}/create-shift`} className="shrink-0">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {dashboardDict?.createJobListing || nav?.createShift || 'Create job listing'}
            </Button>
          </Link>
        </div>

        {/* Applicants - Large tile at top */}
        <Card
          className={`transition-all hover:shadow-lg cursor-pointer h-full mb-6 ${
            counts.applicants > 0
              ? 'border-red-500/50 border-2 hover:border-red-500/70'
              : 'hover:border-slate-300'
          }`}
        >
          <Link href={`/${currentLang}/applicants`} className="block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-slate-700" />
                <CardTitle className="text-xl font-semibold">
                  {nav?.applicants || 'Applicants'}
                </CardTitle>
              </div>
              {counts.applicants > 0 && (
                <Badge
                  className="text-white font-bold text-sm px-2.5 py-1"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  {counts.applicants}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                {dashboardDict?.applicantsDesc || 'Review applications requiring action'}
              </p>
            </CardContent>
          </Link>
        </Card>

        {/* Timesheets - Large tile */}
        <Card className="mb-6 border border-black hover:bg-[#F3F4F6] transition-all cursor-pointer">
          <Link href={`/${currentLang}/timesheets`} className="block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-black" />
                <CardTitle className="text-xl font-semibold text-black">
                  {nav?.timesheets || 'Timesheets'}
                </CardTitle>
              </div>
              {counts.timesheets > 0 && (
                <span className="text-sm text-black font-medium">
                  {counts.timesheets} {dashboardDict?.pendingApproval || 'pending approval'}
                </span>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {dashboardDict?.timesheetsDesc || 'Review and approve worker hours'}
              </p>
            </CardContent>
          </Link>
        </Card>

        {/* Tiles: Locations, Templates, Team, Staff */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-10">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card key={tool.name} className="border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-slate-300 cursor-pointer h-full">
                <Link href={tool.href} className="block">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">
                      {tool.name}
                    </CardTitle>
                    <Icon className="h-5 w-5 text-slate-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-10">
                      <Icon className="h-8 w-8 text-slate-400" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>

        {/* Active Shifts section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {dict.companyShifts?.activeShifts || 'Active Shifts'}
          </h2>
          <ShiftsTabs
            activeShifts={mappedActiveShifts}
            archivedShifts={mappedArchivedShifts}
            onLoadMoreActive={getListingsActivePage}
            onLoadMoreArchived={getListingsArchivedPage}
            loadMoreLabel={dashboardDict?.loadMore ?? 'Load more'}
            lang={currentLang}
            dict={{
              dashboard: {
                recentJobListings: dashboardDict?.recentJobListings || 'Recent Job Listings',
                createShift: dashboardDict?.createShift || 'Create Shift',
                noJobListings: dashboardDict?.noJobListings || 'No job listings',
                createFirstJobListing: dashboardDict?.createFirstJobListing || 'Create your first job listing',
                date: dashboardDict?.date || 'Date',
                time: dashboardDict?.time || 'Time',
                rate: dashboardDict?.rate || 'Rate',
                booked: dashboardDict?.booked || 'Booked',
                team: dashboardDict?.team || 'Team',
              },
              jobBoard: {
                locationNotSpecified: dict.jobBoard?.locationNotSpecified || 'Location not specified',
              },
              status: {
                active: dict.status?.active || 'Active',
                fullyBooked: dict.status?.fullyBooked || 'Fully booked',
                completed: dict.status?.completed || 'Completed',
                cancelled: dict.status?.cancelled || 'Cancelled',
              },
              companyShifts: {
                activeShifts: dict.companyShifts?.activeShifts || 'Active Shifts',
                archiveShifts: dict.companyShifts?.archiveShifts || 'Archive Shifts',
                noActiveShifts: dict.companyShifts?.noActiveShifts || 'No active shifts found.',
                noArchiveShifts: dict.companyShifts?.noArchiveShifts || 'No archived shifts found.',
              },
            }}
          />
        </section>
      </div>
    </div>
  );
}
