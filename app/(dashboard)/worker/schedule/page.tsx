import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Database } from '@/types/database';

type Shift = Database['public']['Tables']['shifts']['Row'];

export default async function SchedulePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  const profileData = profile as { id: string; role: string };

  // Get accepted shifts
  const { data: applications } = await supabase
    .from('shift_applications')
    .select(`
      *,
      shifts!inner(*, locations(name, address))
    `)
    .eq('worker_id', profileData.id)
    .eq('status', 'accepted')
    .order('shifts(start_time)', { ascending: true });

  const acceptedShifts = (applications || []).map((app: any) => ({
    application: app,
    shift: app.shifts,
  }));

  // Group by date
  const shiftsByDate = acceptedShifts.reduce((acc: Record<string, any[]>, item: any) => {
    const date = new Date(item.shift.start_time).toLocaleDateString('da-DK');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Min tidsplan</h1>
        <p className="text-muted-foreground">Se dine accepterede skift</p>
      </div>

      <div className="space-y-6">
        {Object.entries(shiftsByDate).map(([date, shifts]) => (
          <div key={date} className="space-y-4">
            <h2 className="text-xl font-semibold">{date}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {shifts.map((item: any) => {
                const shift = item.shift as Shift & { locations: any };
                return (
                  <Card key={item.application.id}>
                    <CardHeader>
                      <CardTitle>{shift.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>
                        <strong>Sted:</strong> {shift.locations?.name} - {shift.locations?.address}
                      </p>
                      <p>
                        <strong>Start:</strong>{' '}
                        {new Date(shift.start_time).toLocaleString('da-DK')}
                      </p>
                      <p>
                        <strong>Slut:</strong>{' '}
                        {new Date(shift.end_time).toLocaleString('da-DK')}
                      </p>
                      <p>
                        <strong>Løn:</strong> {shift.hourly_rate} DKK/t
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {acceptedShifts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Du har ingen accepterede skift i øjeblikket</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

