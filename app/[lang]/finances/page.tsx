import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FinancesPage({
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
        <h1 className="text-3xl font-bold mb-2">{dict.workerFinances.title}</h1>
        <p className="text-muted-foreground">
          {dict.workerFinances.subtitle}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dict.workerFinances.totalEarnings}</CardTitle>
            <CardDescription>{dict.workerFinances.totalEarningsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatCurrency(totalEarnings, { locale: lang === 'da' ? 'da-DK' : 'en-US' })}
            </div>
            <p className="text-sm text-muted-foreground">
              {timesheets?.length || 0} {dict.workerFinances.approvedTimesheets}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.workerFinances.payslips}</CardTitle>
            <CardDescription>{dict.workerFinances.payslipsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {dict.workerFinances.payslipsUnavailable}
            </p>
            <Button variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              {dict.workerFinances.downloadPayslip}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

