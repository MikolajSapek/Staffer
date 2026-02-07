import { Suspense } from 'react';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUTCISO } from '@/lib/date-utils';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShiftsTabs from '@/components/dashboard/ShiftsTabs';
import { getListingsActivePage, getListingsArchivedPage } from '@/app/actions/shifts';

export const dynamic = 'force-dynamic';

export default async function CompanyListingsPage({ 
  params 
}: { 
  params: Promise<{ lang: string }> 
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const supabase = await createClient();
  
  // Layout już sprawdza autoryzację i rolę - nie trzeba powtarzać tutaj
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null; // Layout już przekierowuje
  }

  // Upewnij się, że stare zmiany są oznaczone jako completed
  await supabase.rpc('update_completed_shifts');

  // Get current time for filtering (UTC for database queries)
  const now = getCurrentUTCISO();

  // Fetch active (upcoming) shifts.
  // Criteria: end_time >= now AND status != 'cancelled'. Uses only status and end_time (no worker/application checks).
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
          worker_details:worker_details!worker_details_profile_id_fkey(
            avatar_url
          )
        )
      )
    `)
    .eq('company_id', user.id)
    .gte('end_time', now)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })
    .range(0, 19);

  if (activeError) {
    console.error('DEBUG [listings shifts SELECT active]:', { error: activeError, code: activeError.code, userId: user?.id });
  }

  // Fetch archived shifts. Criteria: end_time < now OR status IN ('completed', 'cancelled'). Uses only status and end_time (no worker/application checks).
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
          worker_details:worker_details!worker_details_profile_id_fkey(
            avatar_url
          )
        )
      )
    `)
    .eq('company_id', user.id)
    .lt('end_time', now)
    .order('start_time', { ascending: false })
    .range(0, 19);

  if (pastError) {
    console.error('DEBUG [listings shifts SELECT past]:', { error: pastError, code: pastError.code, userId: user?.id });
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
          worker_details:worker_details!worker_details_profile_id_fkey(
            avatar_url
          )
        )
      )
    `)
    .eq('company_id', user.id)
    .in('status', ['completed', 'cancelled'])
    .order('start_time', { ascending: false })
    .range(0, 19);

  if (statusError) {
    console.error('DEBUG [listings shifts SELECT status]:', { error: statusError, code: statusError.code, userId: user?.id });
  }

  // Combine and deduplicate shifts (initial page: up to 20) – zabezpieczenie: data null → pusta tablica
  const allArchivedShifts = [...(pastShifts ?? []), ...(statusShifts ?? [])];
  const uniqueArchivedShifts = Array.from(
    new Map(allArchivedShifts.map(shift => [shift.id, shift])).values()
  ).slice(0, 20);

  // Map shifts to flatten structure for ShiftsTabs component
  const mapShifts = (shifts: any[]) => {
    return (shifts ?? []).map((shift) => ({
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
          profiles: worker ? {
            id: worker.id,
            first_name: worker.first_name,
            last_name: worker.last_name,
            worker_details: workerDetails ? {
              avatar_url: workerDetails.avatar_url
            } : null
          } : null
        };
      })
    }));
  };

  const mappedActiveShifts = mapShifts(activeShifts ?? []);
  const mappedArchivedShifts = mapShifts(uniqueArchivedShifts);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {dict.companyShifts?.title || 'Shifts'}
          </h1>
          <p className="text-slate-500">
            {dict.companyShifts?.description || 'Manage all your active job listings here.'}
          </p>
        </div>
        <Link href={`/${lang}/create-shift`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> 
            {dict.createShift?.createNewShift || 'Create New Listing'}
          </Button>
        </Link>
      </div>

      {/* Content Area - Shifts Tabs */}
      <Suspense fallback={
        <div className="p-10 text-center text-gray-500">
          <p>Loading shifts...</p>
        </div>
      }>
        <ShiftsTabs
          activeShifts={mappedActiveShifts}
          archivedShifts={mappedArchivedShifts}
          onLoadMoreActive={getListingsActivePage}
          onLoadMoreArchived={getListingsArchivedPage}
          loadMoreLabel={dict.dashboard?.loadMore ?? 'Load more'}
          lang={lang}
          dict={{
            dashboard: {
              recentJobListings: dict.dashboard?.recentJobListings || 'Recent Job Listings',
              createShift: dict.dashboard?.createShift || 'Create Shift',
              noJobListings: dict.dashboard?.noJobListings || 'No job listings',
              createFirstJobListing: dict.dashboard?.createFirstJobListing || 'Create your first job listing',
              date: dict.dashboard?.date || 'Date',
              time: dict.dashboard?.time || 'Time',
              rate: dict.dashboard?.rate || 'Rate',
              booked: dict.dashboard?.booked || 'Booked',
              team: dict.dashboard?.team || 'Team',
            },
            jobBoard: {
              locationNotSpecified: dict.jobBoard?.locationNotSpecified || 'Location not specified',
            },
            status: {
              active: dict.status?.active || 'Active',
              fullyBooked: dict.status?.fullyBooked || 'Fully Booked',
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
      </Suspense>
    </div>
  );
}
