import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CreateTemplateForm from '@/components/templates/CreateTemplateForm';
import { getDictionary } from '@/app/[lang]/dictionaries';

export default async function CreateTemplatePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  // Check if company has completed onboarding
  const { data: companyDetails } = await supabase
    .from('company_details')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!companyDetails) {
    redirect(`/${lang}/company-setup`);
  }

  // Fetch company locations (only non-archived)
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, address')
    .eq('company_id', user.id)
    .eq('is_archived', false)
    .order('name', { ascending: true });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.createTemplate.title}</h1>
        <p className="text-muted-foreground">
          {dict.createTemplate.subtitle}
        </p>
      </div>

      <div className="max-w-3xl">
        <CreateTemplateForm 
          companyId={user.id} 
          locations={locations || []} 
          dict={dict.createTemplate}
          locationFormDict={dict.companyLocations.form}
          shiftOptions={dict.shiftOptions}
          lang={lang} 
        />
      </div>
    </div>
  );
}
