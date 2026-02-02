import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { formatDateShort } from '@/lib/date-utils';
import { Wallet, Calendar, TrendingUp, Briefcase } from 'lucide-react';
import { getWorkerTimesheets } from '@/app/actions/timesheets';
import { calculateMonthlyEarnings, calculateAllTimeEarnings } from '@/lib/financial-utils';

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
    .maybeSingle();

  if (!profile || profile.role !== 'worker') {
    redirect(`/${lang}`);
  }

  // Fetch timesheets with full shift and company data (RLS: worker_id = auth.uid())
  const { data: timesheets, error } = await getWorkerTimesheets(user.id);

  console.log('DATA CHECK [Finances]:', { timesheetsCount: timesheets?.length ?? 0, workerId: user.id, error: error?.message ?? null });

  if (error) {
    console.error('SERVER ERROR FETCHING FINANCES:', JSON.stringify(error, null, 2));
  }

  // Calculate monthly and all-time earnings
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyEarnings = calculateMonthlyEarnings(timesheets || [], currentYear, currentMonth);
  const allTimeEarnings = calculateAllTimeEarnings(timesheets || []);

  // Map transactions for display (simplified - no status badges)
  // Data is already flattened by getWorkerTimesheets with company_name directly in shift object
  const transactions = (timesheets || []).map((ts: any) => {
    return {
      id: ts.id,
      totalPay: ts.total_pay || 0,
      shiftTitle: ts.shifts?.title || 'Unknown Shift',
      shiftDate: ts.shifts?.start_time || ts.created_at || '',
      companyName: ts.shifts?.company_name || 'Unknown Company',
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* Earnings This Month */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Earnings This Month
            </CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {formatCurrency(monthlyEarnings)}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {new Date().toLocaleDateString(lang === 'da' ? 'da-DK' : 'en-US', { month: 'long', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>

        {/* All Time Earnings */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              All Time Earnings
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {formatCurrency(allTimeEarnings)}
            </div>
            <p className="text-xs text-green-700 mt-1">
              Total confirmed earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shift History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Your Completed Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No shifts yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Your completed shifts will appear here
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
                        Shift
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        Company
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">
                        Earnings
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-4 font-medium">{tx.shiftTitle}</td>
                        <td className="py-4 text-muted-foreground">{tx.companyName}</td>
                        <td className="py-4 text-muted-foreground">
                          {tx.shiftDate ? formatDateShort(tx.shiftDate) : '-'}
                        </td>
                        <td className="py-4 text-right font-semibold text-green-700">
                          {formatCurrency(tx.totalPay)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="border rounded-lg p-4 space-y-2 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{tx.shiftTitle}</p>
                        <p className="text-sm text-muted-foreground">{tx.companyName}</p>
                      </div>
                      <span className="font-bold text-lg text-green-700 ml-2">
                        {formatCurrency(tx.totalPay)}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        {tx.shiftDate ? formatDateShort(tx.shiftDate) : '-'}
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
