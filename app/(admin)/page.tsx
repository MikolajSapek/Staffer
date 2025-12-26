import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminDashboard() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  // Profile is not used in this component, but we keep it for auth check

  // Get stats
  const { count: totalWorkers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'worker');

  const { count: totalCompanies } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'company');

  const { count: activeShifts } = await supabase
    .from('shifts')
    .select('*', { count: 'exact', head: true })
    .in('status', ['published', 'full']);

  const { count: bannedWorkers } = await supabase
    .from('worker_details')
    .select('*', { count: 'exact', head: true })
    .eq('is_banned', true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Systemoversigt</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Pracownicy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalWorkers || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Firmaer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCompanies || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktive skift</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeShifts || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blokerede konti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bannedWorkers || 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

