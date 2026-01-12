import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { getCompanyFinances } from '@/app/actions/finances';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function BillingPage({
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
    .maybeSingle();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  // Check if company has completed onboarding
  const { data: companyDetails } = await supabase
    .from('company_details')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  // If no company_details, redirect to company-setup
  if (!companyDetails) {
    redirect(`/${lang}/company-setup`);
  }

  // Fetch finances data
  const financesResult = await getCompanyFinances(user.id);

  // Handle errors
  if ('error' in financesResult) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p className="font-semibold">Error</p>
          <p>{financesResult.error}</p>
        </div>
      </div>
    );
  }

  const { summary, transactions } = financesResult;

  // Format currency using Danish locale
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date as dd.MM.yyyy
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Format hours with 2 decimal places
  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.finances.title}</h1>
        <p className="text-muted-foreground">{dict.finances.description}</p>
      </div>

      {/* Total Pending Payment Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardDescription>{dict.finances.totalPending}</CardDescription>
          <CardTitle className="text-4xl font-bold">
            {formatCurrency(summary.totalPending, summary.currency)}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.finances.history}</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {dict.finances.noPayments}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.finances.table.date}</TableHead>
                  <TableHead>{dict.finances.table.worker}</TableHead>
                  <TableHead>{dict.finances.table.shift}</TableHead>
                  <TableHead className="text-right">{dict.finances.table.hours}</TableHead>
                  <TableHead className="text-right">{dict.finances.table.rate}</TableHead>
                  <TableHead className="text-right">{dict.finances.table.amount}</TableHead>
                  <TableHead>{dict.finances.table.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.created_at)}</TableCell>
                    <TableCell>{payment.worker_name_snapshot}</TableCell>
                    <TableCell>{payment.shift_title_snapshot}</TableCell>
                    <TableCell className="text-right">
                      {formatHours(payment.hours_worked)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.hourly_rate, payment.currency)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === 'paid'
                            ? 'default'
                            : payment.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className={
                          payment.status === 'paid'
                            ? 'bg-green-500 hover:bg-green-600'
                            : payment.status === 'pending'
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : ''
                        }
                      >
                        {payment.status === 'pending'
                          ? dict.finances.status.pending
                          : payment.status === 'paid'
                          ? dict.finances.status.paid
                          : dict.finances.status.cancelled}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
