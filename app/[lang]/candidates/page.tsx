import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '../dictionaries';
import CandidatesClient from './CandidatesClient';

export default async function CandidatesPage({
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
    .single();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  // Fetch company's shifts first
  const { data: companyShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('company_id', user.id);

  const shiftIds = companyShifts?.map(s => s.id) || [];

  // Fetch applications for company's shifts with worker details
  const { data: allApplications } = shiftIds.length > 0 ? await supabase
    .from('shift_applications')
    .select(`
      id,
      status,
      applied_at,
      worker_message,
      shift_id,
      worker_id,
      shifts (
        id,
        title,
        start_time
      ),
      profiles:worker_id (
        id,
        email,
        worker_details (
          first_name,
          last_name,
          avatar_url,
          phone_number
        )
      )
    `)
    .in('shift_id', shiftIds)
    .order('applied_at', { ascending: false }) : { data: null };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.candidatesPage.title}</h1>
        <p className="text-muted-foreground">
          {dict.candidatesPage.subtitle}
        </p>
      </div>

      {!allApplications || allApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.candidatesPage.empty}
            </p>
          </CardContent>
        </Card>
      ) : (
        <CandidatesClient
          applications={allApplications as any}
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
}

