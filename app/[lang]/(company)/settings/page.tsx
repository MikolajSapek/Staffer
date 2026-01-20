import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CompanySettingsClient from '@/components/company/settings/CompanySettingsClient';

interface PageProps {
  params: Promise<{
    lang: string;
  }>;
}

export default async function CompanySettingsPage({ params }: PageProps) {
  const { lang } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/${lang}/login`);
  }

  // Verify user is a company
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}/dashboard`);
  }

  return (
    <CompanySettingsClient 
      userId={user.id} 
      userEmail={user.email || ''} 
      lang={lang} 
    />
  );
}
