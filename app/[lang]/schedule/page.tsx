import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import ScheduleCalendarClient from './ScheduleCalendarClient';

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
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'worker') {
    redirect(`/${lang}`);
  }

  // Fetch user's approved shifts with company details
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
        )
      )
    `)
    .eq('worker_id', user.id)
    .in('status', ['approved', 'accepted']) // Support both for backward compatibility
    .order('shifts(start_time)', { ascending: true });

  // Transform data for client component
  interface ApplicationWithShift {
    shifts: {
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      hourly_rate: number;
      company_id: string;
      locations: { name: string; address: string } | null;
      profiles: {
        company_details: {
          company_name: string;
          logo_url: string | null;
        } | null;
      } | null;
    } | null;
  }

  const shifts = (applications as ApplicationWithShift[] | null)
    ?.filter((app) => app.shifts)
    .map((app) => app.shifts) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.workerCalendar.title}</h1>
        <p className="text-muted-foreground">
          {dict.workerCalendar.subtitle}
        </p>
      </div>

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
          dict={dict.workerCalendar}
          lang={lang}
        />
      )}
    </div>
  );
}

