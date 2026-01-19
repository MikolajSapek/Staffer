import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getDictionary } from '@/app/[lang]/dictionaries';
import DashboardActionButtons from '@/components/dashboard/DashboardActionButtons';
import ArchivedShiftsList from '@/components/dashboard/ArchivedShiftsList';
import { Card, CardContent } from '@/components/ui/card';

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

  // Fetch active (upcoming) shifts with detailed profile information
  // Active = end_time >= now AND status != 'cancelled'
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
    .gte('end_time', now)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })
    .limit(10);

  if (activeError) {
    console.error('Error fetching active shifts:', activeError);
  }

  // Map shifts to flatten avatar_url and phone_number from worker_details
  const mappedActiveShifts = (activeShifts || []).map((shift) => ({
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
        // Spłaszczamy strukturę do formatu oczekiwanego przez komponenty
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

  // Fetch worker skills for active shifts using the optimized candidate_skills_view
  let mappedActiveShiftsWithSkills = mappedActiveShifts;
  
  if (mappedActiveShifts && mappedActiveShifts.length > 0) {
    const allWorkerIds = mappedActiveShifts
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
      mappedActiveShiftsWithSkills = mappedActiveShifts.map(shift => ({
        ...shift,
        shift_applications: (shift.shift_applications || []).map((app: any) => ({
          ...app,
          languages: app.worker_id ? (skillsByWorker[app.worker_id]?.languages || []) : [],
          licenses: app.worker_id ? (skillsByWorker[app.worker_id]?.licenses || []) : [],
        }))
      }));
    }
  }

  // Count pending applications (for Applicants button badge)
  const { count: pendingCount } = await supabase
    .from('shift_applications')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', user.id)
    .eq('status', 'pending');

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

        {/* Action Buttons */}
        <div className="mb-8">
          <DashboardActionButtons
            pendingCount={pendingCount || 0}
            lang={lang}
            dict={{
              applicants: dict.dashboard.applicants,
              applicantsDesc: dict.dashboard.applicantsDesc,
              archiveShifts: dict.companyShifts.archiveShifts,
              locations: dict.dashboard.locations,
              templates: dict.dashboard.templates,
              pending: dict.dashboard.pending,
            }}
          />
        </div>
      </div>

      {/* Active Shifts Section */}
      <div id="active-shifts" className="mb-8 scroll-mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">{dict.companyShifts.activeShifts}</h2>
        </div>

        {mappedActiveShiftsWithSkills && mappedActiveShiftsWithSkills.length > 0 ? (
          <ArchivedShiftsList
            archivedShifts={mappedActiveShiftsWithSkills}
            lang={lang}
            dict={dict}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {dict.companyShifts.noActiveShifts}
              </p>
              <Button asChild>
                <Link href={`/${lang}/create-shift`}>
                  <Plus className="mr-2 h-4 w-4" />
                  {dict.dashboard.createJobListing}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

