import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import ApplicantsClient from './ApplicantsClient';

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
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    
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

    return (
    <div className="container mx-auto px-4 py-6">
      {!allApplications || allApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.applicantsPage.empty}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ApplicantsClient
          applications={allApplications as any}
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
  } catch (err: unknown) {
    // Catch any unexpected errors and redirect to login
    redirect(`/${lang}/login`);
  }
}

