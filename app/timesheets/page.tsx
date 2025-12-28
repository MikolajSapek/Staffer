import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { da } from 'date-fns/locale/da';

export default async function TimesheetsPage() {
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

  // Fetch timesheets for company's shifts
  const { data: timesheets } = shiftIds.length > 0 ? await supabase
    .from('timesheets')
    .select(`
      id,
      shift_id,
      worker_id,
      clock_in_time,
      clock_out_time,
      manager_approved_start,
      manager_approved_end,
      status,
      shifts (
        id,
        title,
        start_time,
        end_time,
        hourly_rate
      )
    `)
    .in('shift_id', shiftIds)
    .order('created_at', { ascending: false }) : { data: null };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Ikke registreret';
    return format(new Date(dateString), 'd. MMMM yyyy HH:mm', { locale: da });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      approved: 'default',
      pending: 'secondary',
      disputed: 'destructive',
      paid: 'outline',
    };
    const labels: Record<string, string> = {
      approved: 'Godkendt',
      pending: 'Afventer',
      disputed: 'Disputeret',
      paid: 'Betalt',
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
        <h1 className="text-3xl font-bold mb-2">Tidsregistreringer</h1>
        <p className="text-muted-foreground">
          Godkend eller ret tidsregistreringer fra arbejdere
        </p>
      </div>

      {!timesheets || timesheets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Der er ingen tidsregistreringer endnu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {timesheets.map((timesheet: any) => {
            const shift = timesheet.shifts;
            if (!shift) return null;

            const hasClockIn = !!timesheet.clock_in_time;
            const hasClockOut = !!timesheet.clock_out_time;
            const hasPlanned = !!shift.start_time && !!shift.end_time;

            return (
              <Card key={timesheet.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{shift.title}</CardTitle>
                      <CardDescription>
                        Arbejder ID: {timesheet.worker_id.substring(0, 8)}...
                      </CardDescription>
                    </div>
                    {getStatusBadge(timesheet.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-sm font-medium mb-2">Planlagt tid</div>
                        <div className="text-sm text-muted-foreground">
                          {hasPlanned ? (
                            <>
                              {formatDateTime(shift.start_time)} - {formatDateTime(shift.end_time)}
                            </>
                          ) : (
                            'Ikke angivet'
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2">Registreret tid</div>
                        <div className="text-sm text-muted-foreground">
                          {hasClockIn ? (
                            <>
                              {formatDateTime(timesheet.clock_in_time)}
                              {hasClockOut ? ` - ${formatDateTime(timesheet.clock_out_time)}` : ' - Ikke afmeldt'}
                            </>
                          ) : (
                            'Ikke registreret'
                          )}
                        </div>
                      </div>
                    </div>

                    {timesheet.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" disabled>
                          Godkend
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                          Ret
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                          Afvis
                        </Button>
                      </div>
                    )}
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

