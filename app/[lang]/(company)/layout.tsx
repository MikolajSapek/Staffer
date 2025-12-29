import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CompanyLayoutWrapper from './CompanyLayoutWrapper';

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // If user doesn't have a profile or role is not 'company', redirect to home
  if (!profile || profile.role !== 'company') {
    redirect('/');
  }

  // Check if company_details exists
  const { data: companyDetails } = await supabase
    .from('company_details')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  const hasCompanyDetails = !!companyDetails;

  return (
    <CompanyLayoutWrapper hasCompanyDetails={hasCompanyDetails}>
      {children}
    </CompanyLayoutWrapper>
  );
}

