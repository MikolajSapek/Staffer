import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/app/[lang]/dictionaries';
import OnboardingClient from './OnboardingClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in, redirect to login
  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Check if user already has a role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // If user already has a role, redirect them
  if (profile?.role) {
    if (profile.role === 'worker') {
      redirect(`/${lang}/schedule`);
    } else if (profile.role === 'company') {
      // Check if company has completed onboarding (company_details)
      const { data: companyDetails } = await supabase
        .from('company_details')
        .select('profile_id')
        .eq('profile_id', user.id)
        .maybeSingle();
      
      // Redirect to dashboard (which will handle onboarding if needed)
      redirect(`/${lang}/dashboard`);
    }
  }

  return <OnboardingClient dict={dict} lang={lang} />;
}
