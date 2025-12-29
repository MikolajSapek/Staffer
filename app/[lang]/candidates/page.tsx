import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/date-utils';

export default async function CandidatesPage() {
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

  if (!profile || profile.role !== 'company') {
    redirect('/');
  }

  // Fetch company's shifts first
  const { data: companyShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('company_id', user.id);

  const shiftIds = companyShifts?.map(s => s.id) || [];

  // Fetch applications for company's shifts
  const { data: allApplications } = shiftIds.length > 0 ? await supabase
    .from('shift_applications')
    .select(`
      id,
      status,
      applied_at,
      shift_id,
      worker_id,
      shifts (
        id,
        title,
        start_time
      )
    `)
    .in('shift_id', shiftIds)
    .order('applied_at', { ascending: false }) : { data: null };


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
        <h1 className="text-3xl font-bold mb-2">Kandidater</h1>
        <p className="text-muted-foreground">
          Oversigt over ansøgninger til dine vagter
        </p>
      </div>

      {!allApplications || allApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Der er ingen ansøgninger endnu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allApplications.map((app: any) => {
            const shift = app.shifts;
            if (!shift) return null;

            return (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{shift.title}</CardTitle>
                      <CardDescription>
                        Ansøgt: {formatDateTime(app.applied_at)}
                      </CardDescription>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">Kandidat ID:</span>{' '}
                      {app.worker_id.substring(0, 8)}...
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled>
                        Se profil
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        Accepter
                      </Button>
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

