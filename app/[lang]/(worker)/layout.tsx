import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import WorkerLayoutWrapper from './WorkerLayoutWrapper';
import { getDictionary } from '@/app/[lang]/dictionaries';

export default async function WorkerLayout({
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
    console.warn('WorkerLayout: lang is missing from params, using fallback "en-US"');
  }
  
  const dict = await getDictionary(currentLang as 'en-US' | 'da');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${currentLang}/login`);
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // If user doesn't have a profile or role is not 'worker', redirect to home
  if (!profile || profile.role !== 'worker') {
    redirect(`/${currentLang}`);
  }

  return (
    <WorkerLayoutWrapper lang={currentLang}>
      {children}
    </WorkerLayoutWrapper>
  );
}
