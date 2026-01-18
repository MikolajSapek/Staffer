import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getDictionary } from '@/app/[lang]/dictionaries';
import StatsCards from '@/components/dashboard/StatsCards';
import ArchivedShiftsList from '@/components/dashboard/ArchivedShiftsList';

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Get user profile to check role (layout already checks this, but double-check for safety)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  // Check if company has completed onboarding
  const { data: companyDetails } = await supabase
    .from('company_details')
    .select('company_name')
    .eq('profile_id', user.id)
    .maybeSingle();

  // If no company_details, redirect to company-setup
  if (!companyDetails) {
    redirect(`/${lang}/company-setup`);
  }

  // Upewnij się, że stare zmiany są oznaczone jako completed
  await supabase.rpc('update_completed_shifts');

  // Get current time for filtering
  const now = new Date().toISOString();

  // Fetch archived shifts with detailed profile information
  // Using status filter for archived shifts
  const { data: archivedShifts, error: archivedError } = await supabase
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
          email,
          average_rating,
          total_reviews,
          worker_details:worker_details!worker_details_profile_id_fkey(
            avatar_url,
            phone_number,
            experience,
            description
          )
        )
      )
    `)
    .eq('company_id', user.id)
    .or('status.eq.cancelled,status.eq.completed')
    .order('end_time', { ascending: false })
    .limit(10);

  if (archivedError) {
    console.error('Error fetching archived shifts:', archivedError);
  }

  // Map shifts to flatten avatar_url and phone_number from worker_details
  const mappedArchivedShifts = (archivedShifts || []).map((shift) => ({
    ...shift,
    locations: shift.location, // Mapowanie dla kompatybilności
    shift_applications: (shift.shift_applications || []).map((app: any) => {
      const worker = app.worker;

      // FIX: Obsługa worker_details jako tablicy LUB obiektu
      let details = null;
      if (worker?.worker_details) {
        details = Array.isArray(worker.worker_details) 
          ? worker.worker_details[0] 
          : worker.worker_details;
      }

      return {
        ...app,
        worker_id: worker?.id,
        // Spłaszczamy strukturę do formatu oczekiwanego przez ArchivedShiftsList
        profiles: worker ? {
          id: worker.id,
          first_name: worker.first_name,
          last_name: worker.last_name,
          email: worker.email,
          average_rating: worker.average_rating,
          total_reviews: worker.total_reviews,
          avatar_url: details?.avatar_url || null,
          phone_number: details?.phone_number || null,
          experience: details?.experience || null,
          description: details?.description || null
        } : null
      };
    })
  }));

  // Fetch worker skills for archived shifts using the optimized candidate_skills_view
  let mappedArchivedShiftsWithSkills = mappedArchivedShifts;
  
  if (mappedArchivedShifts && mappedArchivedShifts.length > 0) {
    const allWorkerIds = mappedArchivedShifts
      .flatMap(shift => shift.shift_applications || [])
      .map(app => app.worker_id)
      .filter(Boolean);
    
    const uniqueWorkerIds = [...new Set(allWorkerIds)];
    
    if (uniqueWorkerIds.length > 0) {
      // Type definition for candidate_skills_view
      type CandidateSkills = {
        worker_id: string;
        languages: Array<{ id: string; name: string }>;
        licenses: Array<{ id: string; name: string }>;
      };
      
      const { data: workerSkills } = await supabase
        .from('candidate_skills_view')
        .select('*')
        .in('worker_id', uniqueWorkerIds) as { data: CandidateSkills[] | null; error: any };

      // Create a map of worker_id to skills
      // The view returns arrays of { id, name } objects directly - no parsing needed
      const skillsByWorker: Record<string, { 
        languages: Array<{id: string; name: string}>; 
        licenses: Array<{id: string; name: string}> 
      }> = {};

      workerSkills?.forEach((row) => {
        skillsByWorker[row.worker_id] = {
          languages: row.languages || [],
          licenses: row.licenses || []
        };
      });

      // Attach skills to each application
      mappedArchivedShiftsWithSkills = mappedArchivedShifts.map(shift => ({
        ...shift,
        shift_applications: (shift.shift_applications || []).map((app: any) => ({
          ...app,
          languages: app.worker_id ? (skillsByWorker[app.worker_id]?.languages || []) : [],
          licenses: app.worker_id ? (skillsByWorker[app.worker_id]?.licenses || []) : [],
        }))
      }));
    }
  }

  // Query 1: Count locations for this company (only non-archived)
  const { count: locationsCount } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', user.id)
    .eq('is_archived', false);

  // Query 2: Count active shifts (end_time > now AND status != 'cancelled')
  const { count: activeShiftsCount } = await supabase
    .from('shifts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', user.id)
    .gt('end_time', now)
    .neq('status', 'cancelled');

  // Query 3: Sum vacancies_taken from shifts table for this company
  const { data: shiftsData } = await supabase
    .from('shifts')
    .select('vacancies_taken')
    .eq('company_id', user.id);

  const totalHires = shiftsData?.reduce((sum, shift) => sum + (shift.vacancies_taken || 0), 0) || 0;

  // Query 4: Count shift templates for this company
  const { count: templatesCount } = await supabase
    .from('shift_templates')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', user.id);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {dict.dashboard.welcomeTitle.replace('{name}', companyDetails.company_name || '')}
            </h1>
            <p className="text-muted-foreground">
              {dict.dashboard.welcomeSubtitle}
            </p>
          </div>
          <Button asChild size="lg">
            <Link href={`/${lang}/create-shift`}>
              <Plus className="mr-2 h-4 w-4" />
              {dict.dashboard.createJobListing}
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <StatsCards
            stats={{
              shifts: activeShiftsCount || 0,
              locations: locationsCount || 0,
              hires: totalHires,
              templates: templatesCount || 0,
              managers: 0,
            }}
            dict={{
              activeShifts: dict.dashboard.activeShifts,
              totalLocations: dict.dashboard.totalLocations,
              totalHires: dict.dashboard.totalHires,
              clickToView: dict.dashboard.clickToView,
              clickToManage: dict.dashboard.clickToManage,
            }}
            lang={lang}
          />
        </div>
      </div>

      {/* Archive Shifts Section */}
      <div id="archive-shifts" className="mb-8 scroll-mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">{dict.companyShifts.archiveShifts}</h2>
        </div>

        <ArchivedShiftsList
          archivedShifts={mappedArchivedShiftsWithSkills}
          lang={lang}
          dict={dict}
        />
      </div>
    </div>
  );
}

