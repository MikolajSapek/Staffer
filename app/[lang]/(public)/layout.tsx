import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/app/[lang]/dictionaries';
import WorkerLayoutWrapper from '@/app/[lang]/(worker)/WorkerLayoutWrapper';
import CompanyLayoutWrapper from '@/app/[lang]/(company)/CompanyLayoutWrapper';

/**
 * Public route group: no auth required.
 * For /market: workers get WorkerLayoutWrapper (sidebar); company gets CompanyLayoutWrapper (sidebar); guests get just children.
 */
export default async function PublicLayout({
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
  const { data: { user } } = await supabase.auth.getUser();
  let profile: { role?: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    profile = data;
  }

  const isWorker = user && profile?.role === 'worker';
  if (isWorker) {
    return (
      <WorkerLayoutWrapper lang={currentLang} dict={dict}>
        {children}
      </WorkerLayoutWrapper>
    );
  }

  const isCompany = user && profile?.role === 'company';
  if (isCompany) {
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

  return <>{children}</>;
}
