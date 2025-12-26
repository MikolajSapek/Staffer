import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function WorkerDashboard() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  const profileData = profile as { id: string; role: string };

  // Get worker details
  const { data: workerDetails } = await supabase
    .from('worker_details')
    .select('first_name, last_name, strike_count, is_banned')
    .eq('profile_id', profileData.id)
    .single();

  // Get active applications
  const { data: applications } = await supabase
    .from('shift_applications')
    .select('*, shifts(*)')
    .eq('worker_id', profileData.id)
    .in('status', ['pending', 'accepted'])
    .limit(5);

  // Get available shifts
  const { data: availableShifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('status', 'published')
    .gt('vacancies_total', 'vacancies_taken')
    .order('start_time', { ascending: true })
    .limit(5);

  const workerData = workerDetails as { first_name?: string; strike_count?: number; is_banned?: boolean } | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Velkommen, {workerData?.first_name || 'Pracownik'}
        </h1>
        <p className="text-muted-foreground">Dit dashboard</p>
      </div>

      {workerData?.is_banned && (
        <Card className="border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Din konto er blokeret</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Du har {workerData.strike_count || 0} strikes. Kontakt support for at få hjælp.</p>
          </CardContent>
        </Card>
      )}

      {workerData && (workerData.strike_count || 0) > 0 && !workerData.is_banned && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-600">Advarsel</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Du har {workerData.strike_count || 0} af 3 strikes.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mine ansøgninger</CardTitle>
          </CardHeader>
          <CardContent>
            {applications && applications.length > 0 ? (
              <ul className="space-y-2">
                {applications.map((app: any) => (
                  <li key={app.id} className="flex justify-between">
                    <span>{app.shifts?.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {app.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Ingen aktive ansøgninger</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tilgængelige skift</CardTitle>
          </CardHeader>
          <CardContent>
            {availableShifts && availableShifts.length > 0 ? (
              <ul className="space-y-2">
                {availableShifts.map((shift: any) => (
                  <li key={shift.id} className="flex justify-between">
                    <span>{shift.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {shift.hourly_rate} DKK/t
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Ingen tilgængelige skift</p>
            )}
            <Link href="/worker/jobs" className="mt-4 block">
              <Button variant="outline" className="w-full">
                Se alle skift
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
