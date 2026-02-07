import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import ScheduleCalendarClient from './ScheduleCalendarClient';

export const dynamic = 'force-dynamic';

export default async function SchedulePage({
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
    .select('role, verification_status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'worker') {
    redirect(`/${lang}`);
  }

  // shift_applications: worker_id = auth.uid(), include pending + approved/accepted
  const { data: applications } = await supabase
    .from('shift_applications')
    .select(`
      id,
      status,
      shift_id,
      shifts (
        *,
        locations!location_id (*),
        profiles!company_id (
          company_details!profile_id (
            company_name,
            logo_url
          )
        ),
        managers!manager_id (
          id,
          first_name,
          last_name,
          email,
          phone_number
        )
      )
    `)
    .eq('worker_id', user.id)
    .in('status', ['approved', 'accepted', 'pending'])
    .order('shifts(start_time)', { ascending: true });

  // Transform: include applicationStatus for status styling (Pending/Accepted)
  const shifts = (applications || [])
    .filter((app: any) => app.shifts)
    .map((app: any) => ({ ...app.shifts, applicationStatus: app.status }));

  console.log('DATA CHECK [Calendar]:', { shiftsCount: shifts?.length ?? 0, workerId: user.id, applicationsCount: applications?.length ?? 0 });

  return (
    <div className="container mx-auto px-4 py-6">
      {!shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.workerCalendar.noShifts}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScheduleCalendarClient
          shifts={shifts}
          dict={dict}
          lang={lang}
          user={user}
          userRole={profile.role}
          verificationStatus={profile.verification_status}
        />
      )}
    </div>
  );
}

