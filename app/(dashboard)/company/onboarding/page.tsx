import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CompanyOnboardingForm from '@/components/company/CompanyOnboardingForm';

export default async function CompanyOnboardingPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    redirect('/login');
  }

  const profileData = profile as { id: string; role: string };

  // Check if company details already exist
  const { data: companyDetails } = await supabase
    .from('company_details')
    .select('profile_id')
    .eq('profile_id', profileData.id)
    .single();

  // If already onboarded, redirect to dashboard
  if (companyDetails) {
    redirect('/company/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Velkommen til Staffer</CardTitle>
          <CardDescription>
            Udfyld firmaoplysninger for at komme i gang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyOnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}

