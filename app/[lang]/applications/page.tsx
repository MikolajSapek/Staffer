import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/app/[lang]/dictionaries';
import WorkerApplicationsClient from '@/components/worker/WorkerApplicationsClient';

export default async function ApplicationsPage({
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

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'worker') {
    redirect(`/${lang}`);
  }

  // Step 1: Fetch user's applications with company details
  const { data: applicationsRaw } = await supabase
    .from('shift_applications')
    .select(`
      id,
      status,
      applied_at,
      worker_message,
      shift_id,
      shifts (
        id,
        title,
        start_time,
        end_time,
        hourly_rate,
        locations!location_id (
          name,
          address
        ),
        profiles!company_id (
          first_name,
          avatar_url,
          company_details!profile_id (
            company_name,
            logo_url
          )
        )
      )
    `)
    .eq('worker_id', user.id);

  // Step 2: Fetch all reviews for this worker
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, shift_id, rating, comment, tags, created_at')
    .eq('reviewee_id', user.id);

  // Sort applications by shift start_time (ascending) - from nearest shift to furthest
  // Handle both array and object formats for shifts relation
  const applicationsSorted = (applicationsRaw || []).sort((a: any, b: any) => {
    const shiftA = Array.isArray(a.shifts) ? a.shifts[0] : a.shifts;
    const shiftB = Array.isArray(b.shifts) ? b.shifts[0] : b.shifts;
    
    if (!shiftA?.start_time || !shiftB?.start_time) return 0;
    
    const dateA = new Date(shiftA.start_time).getTime();
    const dateB = new Date(shiftB.start_time).getTime();
    
    return dateA - dateB; // Ascending order (earliest first)
  });

  // Step 3: Merge reviews with applications based on shift_id
  const applications = applicationsSorted.map((app) => ({
    ...app,
    review: reviews?.find((r) => r.shift_id === app.shift_id) || null,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.workerApplications.title}</h1>
        <p className="text-muted-foreground">
          {dict.workerApplications.subtitle}
        </p>
      </div>

      <WorkerApplicationsClient applications={applications || []} dict={dict} />
    </div>
  );
}

