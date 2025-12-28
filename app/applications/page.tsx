import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { da } from 'date-fns/locale/da';

export default async function ApplicationsPage() {
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

  // Fetch user's applications
  const { data: applications } = await supabase
    .from('shift_applications')
    .select(`
      id,
      status,
      applied_at,
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
    .order('applied_at', { ascending: false });

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: da });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd. MMMM yyyy', { locale: da });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      accepted: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      waitlist: 'outline',
    };
    const labels: Record<string, string> = {
      accepted: 'Accepteret',
      pending: 'Afventer',
      rejected: 'Afvist',
      waitlist: 'Venteliste',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mine Ansøgninger</h1>
        <p className="text-muted-foreground">
          Oversigt over dine ansøgninger til vagter
        </p>
      </div>

      {!applications || applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Du har ingen ansøgninger endnu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app: any) => {
            const shift = app.shifts;
            if (!shift) return null;

            return (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{shift.title}</CardTitle>
                      <CardDescription>
                        Ansøgt: {formatDate(app.applied_at)}
                      </CardDescription>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
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
                      <span className="font-medium">Sats:</span>{' '}
                      {shift.hourly_rate} DKK/t
                    </div>
                    <div>
                      <span className="font-medium">Lokation:</span>{' '}
                      {Array.isArray(shift.locations) 
                        ? shift.locations[0]?.name || 'Ikke angivet'
                        : 'Ikke angivet'}
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

