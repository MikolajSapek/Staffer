import { getDictionary } from '@/app/[lang]/dictionaries';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import WorkerProfileForm from '@/components/profile/WorkerProfileForm';
import CompanyProfileForm from '@/components/profile/CompanyProfileForm';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect(`/${lang}/login`);
  }

  // Render appropriate form based on role
  if (profile.role === 'company') {
    return <CompanyProfileForm dict={dict.companyProfile} lang={lang} />;
  } else if (profile.role === 'worker') {
    return <WorkerProfileForm dict={dict} lang={lang} />;
  } else {
    // Admin or unknown role - redirect to home
    redirect(`/${lang}`);
  }
}
