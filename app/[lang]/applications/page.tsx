import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTime, formatDateShort, formatDateTime } from '@/lib/date-utils';
import { getDictionary } from '@/app/[lang]/dictionaries';

export default async function ApplicationsPage({
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


  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      accepted: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      waitlist: 'outline',
    };
    const labels: Record<string, string> = {
      accepted: dict.workerApplications.statusAccepted,
      pending: dict.workerApplications.statusPending,
      rejected: dict.workerApplications.statusRejected,
      waitlist: dict.workerApplications.statusWaitlist,
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
        <h1 className="text-3xl font-bold mb-2">{dict.workerApplications.title}</h1>
        <p className="text-muted-foreground">
          {dict.workerApplications.subtitle}
        </p>
      </div>

      {!applications || applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.workerApplications.noApplications}
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
                        {dict.workerApplications.applied}: {formatDateTime(app.applied_at)}
                      </CardDescription>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">{dict.workerApplications.date}:</span>{' '}
                      {formatDateShort(shift.start_time)}
                    </div>
                    <div>
                      <span className="font-medium">{dict.workerApplications.time}:</span>{' '}
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </div>
                    <div>
                      <span className="font-medium">{dict.workerApplications.rate}:</span>{' '}
                      {shift.hourly_rate} DKK/t
                    </div>
                    <div>
                      <span className="font-medium">{dict.workerApplications.location}:</span>{' '}
                      {shift.locations?.name || dict.workerApplications.locationNotSpecified}
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

