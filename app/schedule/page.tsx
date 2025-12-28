import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { da } from 'date-fns/locale/da';

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'worker') {
    redirect('/');
  }

  // Fetch user's accepted shifts
  const { data: applications } = await supabase
    .from('shift_applications')
    .select(`
      id,
      status,
      shift_id,
      shifts (
        id,
        title,
        start_time,
        end_time,
        hourly_rate,
        locations (
          name,
          address
        )
      )
    `)
    .eq('worker_id', user.id)
    .eq('status', 'accepted')
    .order('shifts(start_time)', { ascending: true });

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: da });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE d. MMMM yyyy', { locale: da });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Min Kalender</h1>
        <p className="text-muted-foreground">
          Dine kommende vagter
        </p>
      </div>

      {!applications || applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Du har ingen kommende vagter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((app: any) => {
            const shift = app.shifts;
            if (!shift) return null;

            return (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>{shift.title}</CardTitle>
                    <Badge variant="secondary">
                      {shift.hourly_rate} DKK/t
                    </Badge>
                  </div>
                  <CardDescription>
                    {shift.locations?.name || 'Lokation ikke angivet'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Dato:</span>{' '}
                      {formatDate(shift.start_time)}
                    </div>
                    <div>
                      <span className="font-medium">Tid:</span>{' '}
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </div>
                    <div>
                      <span className="font-medium">Adresse:</span>{' '}
                      {shift.locations?.address || 'Ikke angivet'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

