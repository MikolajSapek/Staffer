import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function CompanyDashboard() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }
  const profileData = profile as { id: string; role: string };

  // Get company details
  const { data: companyDetails } = await supabase
    .from('company_details')
    .select('*')
    .eq('profile_id', profileData.id)
    .single();

  // Get stats
  const { count: activeShifts } = await supabase
    .from('shifts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profileData.id)
    .in('status', ['published', 'full']);

  // Get company shifts first
  const { data: companyShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('company_id', profileData.id);

  const shiftIds = (companyShifts as { id: string }[] | null)?.map((s) => s.id) || [];

  const { count: pendingApplications } = shiftIds.length > 0
    ? await supabase
        .from('shift_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('shift_id', shiftIds)
    : { count: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Velkommen, {(companyDetails as { company_name?: string } | null)?.company_name || 'Firma'}
        </h1>
        <p className="text-muted-foreground">Dit dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle>Ventende ansøgninger</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingApplications || 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


