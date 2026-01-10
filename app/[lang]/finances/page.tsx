import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { formatDateShort } from '@/lib/date-utils';
import { Wallet, Clock, TrendingUp, Receipt } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Timesheet {
  id: string;
  status: 'pending' | 'approved' | 'disputed' | 'paid';
  manager_approved_start: string | null;
  manager_approved_end: string | null;
  created_at: string;
  shift: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    company_id: string;
  } | null;
}

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
    .maybeSingle();

  if (!profile || profile.role !== 'worker') {
    redirect(`/${lang}`);
  }

  // Fetch timesheets with shift data (only existing timesheets - not applications)
  const { data: timesheets, error } = await supabase
    .from('timesheets')
    .select(`
      *,
      shift:shifts (
        id,
        title,
        hourly_rate,
        start_time,
        end_time,
        company_id
      )
    `)
    .eq('worker_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('SERVER ERROR FETCHING FINANCES:', JSON.stringify(error, null, 2));
  }

  // Fetch company names for all unique company IDs
  const companyIds = new Set<string>();
  (timesheets || []).forEach((ts: any) => {
    const shift = Array.isArray(ts.shift) ? ts.shift[0] : ts.shift;
    if (shift?.company_id) {
      companyIds.add(shift.company_id);
    }
  });

  let companyNameMap: Record<string, string> = {};
  if (companyIds.size > 0) {
    const { data: companyDetails } = await supabase
      .from('company_details')
      .select('profile_id, company_name')
      .in('profile_id', Array.from(companyIds));

    if (companyDetails) {
      companyDetails.forEach((cd) => {
        companyNameMap[cd.profile_id] = cd.company_name;
      });
    }
  }

  // Calculate totals and map data
  let pendingBalance = 0;
  let totalEarnings = 0;

  const transactions = (timesheets || []).map((ts: any) => {
    const shift = Array.isArray(ts.shift) ? ts.shift[0] : ts.shift;
    
    // Calculate total_pay based on manager_approved times or shift scheduled times
    let totalPay = 0;
    if (shift) {
      // Use manager_approved times if available, otherwise fall back to shift scheduled times
      const startTime = ts.manager_approved_start || shift.start_time;
      const endTime = ts.manager_approved_end || shift.end_time;
      
      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalPay = hours * (shift.hourly_rate || 0);
      }
    }

    // Sum up balances based on status
    if (ts.status === 'pending') {
      pendingBalance += totalPay;
    } else if (ts.status === 'approved' || ts.status === 'paid') {
      totalEarnings += totalPay;
    }

    return {
      id: ts.id,
      status: ts.status,
      totalPay,
      shiftTitle: shift?.title || 'Unknown Shift',
      shiftDate: shift?.end_time || ts.manager_approved_end || ts.created_at || '',
      companyName: shift?.company_id ? (companyNameMap[shift.company_id] || 'Unknown Company') : 'Unknown Company',
    };
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      paid: 'default',
      disputed: 'destructive',
    };
    // Status labels: simplified to "Pending" and "Approved"
    const labels: Record<string, string> = {
      pending: 'Pending',
      approved: 'Approved',
      paid: 'Approved',
      disputed: dict.workerFinances.statusDisputed,
    };
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      approved: 'bg-green-100 text-green-800 hover:bg-green-100',
      paid: 'bg-green-100 text-green-800 hover:bg-green-100', // Same as approved
      disputed: 'bg-red-100 text-red-800 hover:bg-red-100',
    };
    return (
      <Badge variant={variants[status] || 'secondary'} className={colors[status] || ''}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.workerFinances.title}</h1>
        <p className="text-muted-foreground">
          {dict.workerFinances.subtitle}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {/* Pending Balance */}
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">
              {dict.workerFinances.pendingBalance}
            </CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-900">
              {formatCurrency(pendingBalance)}
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              {dict.workerFinances.pendingBalanceDescription}
            </p>
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              {dict.workerFinances.totalEarnings}
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {formatCurrency(totalEarnings)}
            </div>
            <p className="text-xs text-green-700 mt-1">
              {dict.workerFinances.totalEarningsDescription}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {dict.workerFinances.transactionHistory}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {dict.workerFinances.noTransactions}
              </h3>
              <p className="text-sm text-muted-foreground">
                {dict.workerFinances.noTransactionsDescription}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">
                        {dict.workerFinances.shift}
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        {dict.workerFinances.company}
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        {dict.workerFinances.date}
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">
                        {dict.workerFinances.amount}
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">
                        {dict.workerFinances.status}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-4 font-medium">{tx.shiftTitle}</td>
                        <td className="py-4 text-muted-foreground">{tx.companyName}</td>
                        <td className="py-4 text-muted-foreground">
                          {tx.shiftDate ? formatDateShort(tx.shiftDate) : '-'}
                        </td>
                        <td className="py-4 text-right font-semibold">
                          {formatCurrency(tx.totalPay)}
                        </td>
                        <td className="py-4 text-right">
                          {getStatusBadge(tx.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{tx.shiftTitle}</p>
                        <p className="text-sm text-muted-foreground">{tx.companyName}</p>
                      </div>
                      {getStatusBadge(tx.status)}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        {tx.shiftDate ? formatDateShort(tx.shiftDate) : '-'}
                      </span>
                      <span className="font-semibold text-lg">
                        {formatCurrency(tx.totalPay)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
