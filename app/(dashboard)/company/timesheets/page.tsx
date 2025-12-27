import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/types/database';

type Timesheet = Database['public']['Tables']['timesheets']['Row'];
type Shift = Database['public']['Tables']['shifts']['Row'];
type WorkerDetails = Database['public']['Tables']['worker_details']['Row'];

export default async function TimesheetsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  const profileData = profile as { id: string; role: string };

  // Get company shifts
  const { data: companyShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('company_id', profileData.id);

  const shiftIds = (companyShifts || []).map((s: any) => s.id);

  // Get timesheets for company shifts
  const { data: timesheets } = shiftIds.length > 0
    ? await supabase
        .from('timesheets')
        .select(`
          *,
          shifts!inner(id, title, start_time, end_time, hourly_rate),
          profiles!worker_id(worker_details(first_name, last_name))
        `)
        .in('shift_id', shiftIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
    paid: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tidsregistrering</h1>
        <p className="text-muted-foreground">Godkend eller disputér timesedler</p>
      </div>

      <div className="space-y-4">
        {(timesheets || []).map((timesheet: any) => {
          const ts = timesheet as Timesheet & {
            shifts: Shift;
            profiles: { worker_details: WorkerDetails | null } | null;
          };
          const shift = ts.shifts;
          const workerDetails = ts.profiles?.worker_details;
          
          const hours = ts.manager_approved_start && ts.manager_approved_end
            ? (new Date(ts.manager_approved_end).getTime() - new Date(ts.manager_approved_start).getTime()) / (1000 * 60 * 60)
            : ts.clock_in_time && ts.clock_out_time
            ? (new Date(ts.clock_out_time).getTime() - new Date(ts.clock_in_time).getTime()) / (1000 * 60 * 60)
            : shift
            ? (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60)
            : 0;
          
          const earnings = hours * (shift?.hourly_rate || 0);

          return (
            <Card key={ts.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{shift?.title || 'Ukendt skift'}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {workerDetails
                        ? `${workerDetails.first_name} ${workerDetails.last_name}`
                        : 'Ukendt arbejder'}
                    </p>
                  </div>
                  <Badge className={statusColors[ts.status] || ''}>
                    {ts.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Dato:</strong> {shift?.start_time ? new Date(shift.start_time).toLocaleDateString('da-DK') : 'N/A'}</p>
                    <p><strong>Timer:</strong> {hours.toFixed(2)}</p>
                    <p><strong>Sats:</strong> {shift?.hourly_rate || 0} DKK/t</p>
                  </div>
                  <div>
                    <p><strong>Indtjening:</strong> {earnings.toFixed(2)} DKK</p>
                    {ts.clock_in_time && (
                      <p><strong>Clock-in:</strong> {new Date(ts.clock_in_time).toLocaleString('da-DK')}</p>
                    )}
                    {ts.clock_out_time && (
                      <p><strong>Clock-out:</strong> {new Date(ts.clock_out_time).toLocaleString('da-DK')}</p>
                    )}
                  </div>
                </div>
                {ts.manager_approved_start && ts.manager_approved_end && (
                  <div className="text-sm border-t pt-4">
                    <p><strong>Godkendt start:</strong> {new Date(ts.manager_approved_start).toLocaleString('da-DK')}</p>
                    <p><strong>Godkendt slut:</strong> {new Date(ts.manager_approved_end).toLocaleString('da-DK')}</p>
                  </div>
                )}
                {ts.is_no_show && (
                  <Badge className="bg-red-100 text-red-800">No-show</Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!timesheets || timesheets.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Ingen timesedler endnu</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

