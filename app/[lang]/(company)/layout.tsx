import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CompanyLayoutWrapper from './CompanyLayoutWrapper';
import { getDictionary } from '@/app/[lang]/dictionaries';

/**
 * JEDYNE źródło prawdy dla zalogowanej firmy.
 * Wszystkie trasy w (company) używają tego layoutu – Sidebar jest zawsze renderowany,
 * bez starego Navbara. Sesja jest walidowana przy każdym żądaniu (createClient + getUser).
 */
export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentLang = lang || 'en-US';

  const dict = await getDictionary(currentLang as 'en-US' | 'da');
  const supabase = await createClient();
  // Re-walidacja sesji przy każdym żądaniu (cookies) – ważne przy otwieraniu linku w nowym oknie
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError) console.error('CompanyLayout: Auth error:', authError);
    redirect(`/${currentLang}/login`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('CompanyLayout: Profile fetch error:', profileError);
    redirect(`/${currentLang}/login`);
  }

  // If user doesn't have a profile or role is not 'company', redirect to home
  if (!profile || profile.role !== 'company') {
    console.warn('CompanyLayout: User role check failed', {
      hasProfile: !!profile,
      role: profile?.role,
      userId: user.id
    });
    redirect(`/${currentLang}`);
  }

  // Check if company_details exists
  const { data: companyDetails } = await supabase
    .from('company_details')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  const hasCompanyDetails = !!companyDetails;

  return (
    <CompanyLayoutWrapper hasCompanyDetails={hasCompanyDetails} dict={dict} lang={currentLang}>
      {children}
    </CompanyLayoutWrapper>
  );
}

