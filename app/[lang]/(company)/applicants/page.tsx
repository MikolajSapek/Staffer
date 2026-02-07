import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import ApplicantsClient from './ApplicantsClient';
import { getDateOffsetUTCISO } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Handle network/auth errors gracefully
    if (error) {
      // Redirect to login on auth errors (including network failures)
      redirect(`/${lang}/login`);
    }

    if (!user) {
      redirect(`/${lang}/login`);
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'company') {
      redirect(`/${lang}`);
    }

    // Fetch applications for company's shifts with worker details
    // Filter: only shifts where end_time > (now - 3 days)
    // Using worker_details table via nested join through profiles (1:1 via profile_id)
    // Fetch from profiles: first_name, last_name, email
    // Fetch from worker_details: avatar_url, phone_number, experience, description
    // Calculate date 3 days ago (UTC for database queries)
    const threeDaysAgo = getDateOffsetUTCISO(-3 * 24 * 60 * 60 * 1000);
    
    const { data: allApplications, error: fetchError } = await supabase
      .from('shift_applications')
      .select(`
        id,
        status,
        applied_at,
        worker_message,
        shift_id,
        worker_id,
        shifts!inner (
          id,
          title,
          description,
          start_time,
          end_time,
          hourly_rate,
          break_minutes,
          is_break_paid,
          vacancies_total,
          vacancies_taken,
          location_id,
          locations:location_id (
            name,
            address
          )
        ),
        profiles:worker_id (
          id,
          first_name,
          last_name,
          email,
          average_rating,
          total_reviews,
          worker_details (
            avatar_url,
            phone_number,
            experience,
            description
          )
        )
      `)
      .eq('company_id', user.id)
      .gt('shifts.end_time', threeDaysAgo)
      .order('applied_at', { ascending: false });

    // Handle fetch errors gracefully
    if (fetchError) {
      // Return empty state instead of crashing
      return (
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {dict.applicantsPage.empty || 'Unable to load applications. Please try again later.'}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Fetch worker_relations (favorite/blacklist) for company to enrich applications
    const workerIds = (allApplications || [])
      .map((app: { profiles?: { id?: string } }) => app.profiles?.id)
      .filter(Boolean) as string[];
    let relationsMap: Record<string, { is_favorite: boolean; is_blacklist: boolean }> = {};
    if (workerIds.length > 0) {
      const { data: relations } = await supabase
        .from('worker_relations')
        .select('worker_id, relation_type')
        .eq('company_id', user.id)
        .in('worker_id', workerIds);
      relations?.forEach((r: { worker_id: string; relation_type: string }) => {
        relationsMap[r.worker_id] = relationsMap[r.worker_id] || { is_favorite: false, is_blacklist: false };
        if (r.relation_type === 'favorite') relationsMap[r.worker_id].is_favorite = true;
        if (r.relation_type === 'blacklist') relationsMap[r.worker_id].is_blacklist = true;
      });
    }

    const enrichedApplications = (allApplications || []).map((app: { profiles?: { id?: string } }) => ({
      ...app,
      is_favorite: relationsMap[app.profiles?.id ?? '']?.is_favorite ?? false,
      is_blacklist: relationsMap[app.profiles?.id ?? '']?.is_blacklist ?? false,
    }));

    return (
      <>
        {!enrichedApplications || enrichedApplications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {dict.applicantsPage.empty}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ApplicantsClient
            applications={enrichedApplications as any}
            dict={dict}
            lang={lang}
          />
        )}
      </>
    );
  } catch (err: unknown) {
    // Catch any unexpected errors and redirect to login
    redirect(`/${lang}/login`);
  }
}

