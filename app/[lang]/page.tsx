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
  let user = null;
  let userRole: 'worker' | 'company' | 'admin' | null = null;
  let shifts: any[] = [];
  let appliedShiftIds: string[] = [];
  let applicationStatusMap: Record<string, string> = {};

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    user = userData?.user || null;
    
    // Get user profile to check role
    if (user) {
      const profile = await getCurrentProfile();
      userRole = profile?.role as 'worker' | 'company' | 'admin' | null;
      
      // If worker, fetch their applications to show application status
      if (userRole === 'worker') {
        const { data: applications } = await supabase
          .from('shift_applications')
          .select('shift_id, status')
          .eq('worker_id', user.id);
        
        appliedShiftIds = applications?.map(app => app.shift_id) || [];
        // Create a map of shift_id -> status for accurate status display
        applications?.forEach(app => {
          // Map 'accepted' to 'approved' for backward compatibility if needed
          const status = app.status === 'accepted' ? 'approved' : app.status;
          applicationStatusMap[app.shift_id] = status;
        });
      }
    }

    // Fetch active shifts - this should work for public access
    // Wrap in try-catch to handle any errors gracefully
    try {
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select(`
          id,
          title,
          hourly_rate,
          start_time,
          end_time,
          vacancies_total,
          vacancies_taken,
          status,
          company_id,
          locations (
            name,
            address
          )
        `)
        .eq('status', 'published')
        .order('start_time', { ascending: true });

      if (shiftsError) {
        console.warn('Error fetching shifts:', {
          message: shiftsError.message,
          details: shiftsError.details,
          hint: shiftsError.hint,
          code: shiftsError.code
        });
        // Set shifts to empty array instead of crashing
        shifts = [];
      } else {
        shifts = shiftsData || [];
      }
    } catch (fetchError: any) {
      console.warn('Error in shifts query:', {
        message: fetchError?.message,
        name: fetchError?.name
      });
      // Set shifts to empty array instead of crashing
      shifts = [];
    }
  } catch (err: any) {
    console.warn('Unexpected error in JobBoardPage:', {
      message: err?.message,
      name: err?.name,
      stack: err?.stack
    });
    // Don't set error - just use empty shifts array
    shifts = [];
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.jobBoard.title}</h1>
        <p className="text-muted-foreground">
          {dict.jobBoard.subtitle}
        </p>
      </div>

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
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
}

