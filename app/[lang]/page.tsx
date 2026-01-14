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

  const { data: shiftsData, error: shiftsError } = await supabase
    .from('shifts')
    .select(`
      *,
      locations!location_id (*),
      profiles!company_id (
        company_details!profile_id (
          company_name,
          logo_url
        )
      )
    `)
    .eq('status', 'published')
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  const shifts = shiftsError ? [] : (shiftsData || []);

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
          verificationStatus={verificationStatus}
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
}

