import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/types/database';

type Timesheet = Database['public']['Tables']['timesheets']['Row'];

export default async function FinancesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  const profileData = profile as { id: string; role: string };

  // Get timesheets with shift information
  const { data: timesheets } = await supabase
    .from('timesheets')
    .select(`
      *,
      shifts!inner(title, hourly_rate, start_time, end_time)
    `)
    .eq('worker_id', profileData.id)
    .order('created_at', { ascending: false });

  // Calculate total earnings
  const totalEarnings = (timesheets || []).reduce((total: number, timesheet: any) => {
    if (timesheet.status === 'paid' && timesheet.shifts) {
      const shift = timesheet.shifts;
      const hours = timesheet.manager_approved_start && timesheet.manager_approved_end
        ? (new Date(timesheet.manager_approved_end).getTime() - new Date(timesheet.manager_approved_start).getTime()) / (1000 * 60 * 60)
        : (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60);
      return total + (hours * shift.hourly_rate);
    }
    return total;
  }, 0);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
    paid: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mine lønsedler</h1>
        <p className="text-muted-foreground">Se din arbejdshistorie og indtjening</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total indtjening</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{totalEarnings.toFixed(2)} DKK</p>
          <p className="text-sm text-muted-foreground">Fra betalte timesedler</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Timesedler</h2>
        {(timesheets || []).map((timesheet: any) => {
          const ts = timesheet as Timesheet & { shifts: any };
          const shift = ts.shifts;
          const hours = ts.manager_approved_start && ts.manager_approved_end
            ? (new Date(ts.manager_approved_end).getTime() - new Date(ts.manager_approved_start).getTime()) / (1000 * 60 * 60)
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
                      {shift?.start_time
                        ? new Date(shift.start_time).toLocaleDateString('da-DK')
                        : 'N/A'}
                    </p>
                  </div>
                  <Badge className={statusColors[ts.status] || ''}>
                    {ts.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Timer:</strong> {hours.toFixed(2)}</p>
                    <p><strong>Sats:</strong> {shift?.hourly_rate || 0} DKK/t</p>
                  </div>
                  <div>
                    <p><strong>Indtjening:</strong> {earnings.toFixed(2)} DKK</p>
                    {ts.clock_in_time && (
                      <p><strong>Clock-in:</strong> {new Date(ts.clock_in_time).toLocaleString('da-DK')}</p>
                    )}
                  </div>
                </div>
                {ts.is_no_show && (
                  <p className="text-red-600 font-semibold">No-show</p>
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

