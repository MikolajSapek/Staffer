import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import WorkerOnboardingForm from '@/components/worker/WorkerOnboardingForm';

export default async function WorkerOnboardingPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    redirect('/login');
  }

  const profileData = profile as { id: string; role: string };

  // Check if worker details already exist
  const { data: workerDetails } = await supabase
    .from('worker_details')
    .select('profile_id')
    .eq('profile_id', profileData.id)
    .single();

  // If already onboarded, redirect to dashboard
  if (workerDetails) {
    redirect('/worker/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Velkommen til Staffer</CardTitle>
          <CardDescription>
            Udfyld dine oplysninger for at komme i gang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkerOnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}

