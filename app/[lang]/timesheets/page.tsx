import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '../dictionaries';
import TimesheetsClient from '../(company)/timesheets/TimesheetsClient';

export default async function TimesheetsPage({
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

  // Fetch timesheets that need approval:
  // - status = 'pending'
  // - shifts.end_time < now() (past shifts)
  const now = new Date().toISOString();

  const { data: timesheets } = await supabase
    .from('timesheets')
    .select(`
      id,
      status,
      worker_id,
      manager_approved_start,
      manager_approved_end,
      shifts!inner(
        id,
        title,
        start_time,
        end_time,
        hourly_rate,
        company_id
      ),
      profiles:worker_id(
        first_name,
        last_name,
        email,
        worker_details (
          avatar_url
        )
      )
    `)
    .eq('status', 'pending')
    .eq('shifts.company_id', user.id)
    .lt('shifts.end_time', now)
    .order('created_at', { ascending: false });


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.timesheetsPage.title}</h1>
        <p className="text-muted-foreground">
          {dict.timesheetsPage.subtitle}
        </p>
      </div>

      <TimesheetsClient
        timesheets={timesheets || []}
        dict={dict}
        lang={lang}
      />
    </div>
  );
}

