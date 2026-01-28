import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CompanyLayoutWrapper from './CompanyLayoutWrapper';
import { getDictionary } from '@/app/[lang]/dictionaries';

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  // W Next.js 15 params jest Promise, więc trzeba użyć await
  const { lang } = await params;
  
  // Zabezpieczenie: jeśli lang jest undefined/null, użyj 'en-US'
  const currentLang = lang || 'en-US';
  
  // Debug (opcjonalnie, usuń po testach)
  if (!lang) {
    console.warn('CompanyLayout: lang is missing from params, using fallback "en-US"');
  }
  
  const dict = await getDictionary(currentLang as 'en-US' | 'da');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error('CompanyLayout: Auth error:', authError);
    redirect(`/${currentLang}/login`);
  }

  if (!user) {
    redirect(`/${currentLang}/login`);
  }

  // Get user profile to check role
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

