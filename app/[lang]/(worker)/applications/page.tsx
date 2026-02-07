import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/app/[lang]/dictionaries';
import WorkerApplicationsClient from '@/components/worker/WorkerApplicationsClient';

export const dynamic = 'force-dynamic';

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
    .select('role, verification_status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'worker') {
    redirect(`/${lang}`);
  }

  // Step 1: Fetch user's applications with company details and manager contact
  const { data: applicationsRaw } = await supabase
    .from('shift_applications')
    .select(`
      *,
      shifts (
        *,
        locations (*),
        profiles (
          *,
          company_details (*)
        ),
        managers!manager_id (
          id,
          first_name,
          last_name,
          phone_number,
          email
        )
      )
    `)
    .eq('worker_id', user.id);

  // Step 2: Fetch all reviews for this worker
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, shift_id, rating, comment, tags, created_at')
    .eq('reviewee_id', user.id);

  // Filter out withdrawn (cancelled) applications
  const applicationsFiltered = (applicationsRaw || []).filter(
    (app: { status: string }) => app.status !== 'cancelled'
  );

  // Sort applications by shift start_time (ascending) - from nearest shift to furthest
  // Handle both array and object formats for shifts relation
  const applicationsSorted = applicationsFiltered.sort((a: any, b: any) => {
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
    <WorkerApplicationsClient 
      applications={applications || []} 
      dict={dict}
      user={user}
      userRole="worker"
      verificationStatus={profile?.verification_status ?? null}
    />
  );
}

