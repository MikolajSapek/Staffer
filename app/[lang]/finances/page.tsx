import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateShort } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';

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

  // Fetch payments for this worker
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .eq('worker_id', user.id)
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  }

  // Calculate totals as per requirements
  // Total Earned: sum of all payments (regardless of status)
  const totalEarned = payments?.reduce((sum, payment) => {
    return sum + parseFloat(payment.amount?.toString() || '0');
  }, 0) || 0;

  // Awaiting Payment: sum of payments with status 'pending'
  const awaitingPayment = payments?.reduce((sum, payment) => {
    return sum + (payment.status === 'pending' ? parseFloat(payment.amount?.toString() || '0') : 0);
  }, 0) || 0;

  // Already Paid: sum of payments with status 'paid'
  const alreadyPaid = payments?.reduce((sum, payment) => {
    return sum + (payment.status === 'paid' ? parseFloat(payment.amount?.toString() || '0') : 0);
  }, 0) || 0;

  // Get all payments for history table (sorted by created_at desc)
  const paymentHistory = payments || [];

  // Status badge colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.workerFinances.title}</h1>
        <p className="text-muted-foreground">
          {dict.workerFinances.subtitle}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Earned</CardTitle>
            <CardDescription>Sum of all payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatCurrency(totalEarned, { locale: lang === 'da' ? 'da-DK' : 'en-US' })}
            </div>
            <p className="text-sm text-muted-foreground">
              {payments?.length || 0} total payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Awaiting Payment</CardTitle>
            <CardDescription>Sum of payments with status 'pending'</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatCurrency(awaitingPayment, { locale: lang === 'da' ? 'da-DK' : 'en-US' })}
            </div>
            <p className="text-sm text-muted-foreground">
              {payments?.filter(p => p.status === 'pending').length || 0} pending payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Already Paid</CardTitle>
            <CardDescription>Sum of payments with status 'paid'</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatCurrency(alreadyPaid, { locale: lang === 'da' ? 'da-DK' : 'en-US' })}
            </div>
            <p className="text-sm text-muted-foreground">
              {payments?.filter(p => p.status === 'paid').length || 0} paid payments
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your payment history with date, shift title, amount, and status</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No payments found yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.created_at ? formatDateShort(payment.created_at) : 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.shift_title_snapshot || 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(parseFloat(payment.amount?.toString() || '0'), { locale: lang === 'da' ? 'da-DK' : 'en-US' })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
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

