import { getDictionary } from '@/app/[lang]/dictionaries';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ManagersClient from './ManagersClient';

export default async function ManagersPage({
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

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  return <ManagersClient dict={dict.managers} lang={lang} />;
}
