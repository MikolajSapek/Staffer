import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { applyToShift } from '@/app/actions/shifts';
import type { Database } from '@/types/database';
import ApplyToShiftButton from '@/components/worker/ApplyToShiftButton';

type Shift = Database['public']['Tables']['shifts']['Row'];

export default async function JobsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  const profileData = profile as { id: string; role: string };

  // Get available shifts
  const { data: shifts } = await supabase
    .from('shifts')
    .select(`
      *,
      locations(name, address),
      shift_applications!left(status)
    `)
    .eq('status', 'published')
    .order('start_time', { ascending: true });

  // Filter shifts with available vacancies
  const availableShifts = (shifts || []).filter((shift: any) => {
    const shiftData = shift as Shift & { locations: any; shift_applications: any[] };
    return shiftData.vacancies_taken < shiftData.vacancies_total;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Jobbørsen</h1>
        <p className="text-muted-foreground">Se tilgængelige skift og ansøg</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableShifts.map((shift: any) => {
          const shiftData = shift as Shift & { locations: any; shift_applications: any[] };
          const location = shiftData.locations;
          const hasApplied = shiftData.shift_applications?.some(
            (app: any) => app.status && ['pending', 'accepted', 'waitlist'].includes(app.status)
          );

          return (
            <Card key={shiftData.id}>
              <CardHeader>
                <CardTitle>{shiftData.title}</CardTitle>
                <CardDescription>
                  {location?.name} - {location?.address}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Kategori:</strong> {shiftData.category}
                  </p>
                  <p>
                    <strong>Start:</strong>{' '}
                    {new Date(shiftData.start_time).toLocaleString('da-DK')}
                  </p>
                  <p>
                    <strong>Slut:</strong>{' '}
                    {new Date(shiftData.end_time).toLocaleString('da-DK')}
                  </p>
                  <p>
                    <strong>Løn:</strong> {shiftData.hourly_rate} DKK/t
                  </p>
                  <p>
                    <strong>Ledige pladser:</strong>{' '}
                    {shiftData.vacancies_total - shiftData.vacancies_taken} / {shiftData.vacancies_total}
                  </p>
                  {shiftData.description && (
                    <p className="text-muted-foreground">{shiftData.description}</p>
                  )}
                </div>
                {hasApplied ? (
                  <Button disabled className="w-full">
                    Allerede ansøgt
                  </Button>
                ) : (
                  <ApplyToShiftButton shiftId={shiftData.id} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {availableShifts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Ingen tilgængelige skift i øjeblikket</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
