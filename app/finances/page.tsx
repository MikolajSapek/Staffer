import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default async function FinancesPage() {
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

  // Fetch approved timesheets for salary calculation
  const { data: timesheets } = await supabase
    .from('timesheets')
    .select(`
      id,
      status,
      shifts (
        hourly_rate,
        start_time,
        end_time
      )
    `)
    .eq('worker_id', user.id)
    .eq('status', 'approved');

  // Calculate total earnings (placeholder - would need actual hours calculation)
  const totalEarnings = 0; // TODO: Calculate from timesheets

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Økonomi</h1>
        <p className="text-muted-foreground">
          Din løn og lønsedler
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Samlet indtjening</CardTitle>
            <CardDescription>Dine godkendte timer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {totalEarnings.toLocaleString('da-DK')} DKK
            </div>
            <p className="text-sm text-muted-foreground">
              {timesheets?.length || 0} godkendte tidsregistreringer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lønsedler</CardTitle>
            <CardDescription>Download dine lønsedler</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Lønsedler vil blive tilgængelige efter første udbetaling.
            </p>
            <Button variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Download lønseddel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

