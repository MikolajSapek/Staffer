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
import { CorrectionBadge } from '@/components/ui/correction-badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

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

  // Upewnij się, że stare zmiany są oznaczone jako completed
  await supabase.rpc('update_completed_shifts');

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

  // Format date as dd MMM yyyy (e.g., "15 Jan 2024")
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Get initials from worker name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format hours with 2 decimal places
  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  // Format correction note to a concise label
  const formatCorrectionNote = (note: string | undefined | null, hoursWorked: number): string | null => {
    if (!note) return null;
    
    // If note is short, use it directly
    if (note.length <= 30) {
      return note.toUpperCase();
    }
    
    // Extract hour difference from patterns like "Hours reduced by company from 3.00 to 2.75"
    const fromToMatch = note.match(/from\s+(\d+\.?\d*)\s+to\s+(\d+\.?\d*)/i);
    if (fromToMatch) {
      const fromHours = parseFloat(fromToMatch[1]);
      const toHours = parseFloat(fromToMatch[2]);
      const diff = toHours - fromHours;
      const diffFormatted = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
      return `CORR: ${diffFormatted}h`;
    }
    
    // Extract "reduced by" pattern
    const reducedMatch = note.match(/reduced\s+by\s+(\d+\.?\d*)/i);
    if (reducedMatch) {
      const reduction = parseFloat(reducedMatch[1]);
      return `CORR: -${reduction.toFixed(2)}h`;
    }
    
    // Fallback: show MODIFIED with current hours
    return `MODIFIED: ${hoursWorked.toFixed(2)}h`;
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
                  <TableHead className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                    {dict.finances.table.date}
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                    {dict.finances.table.worker}
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-semibold tracking-wider text-right">
                    {dict.finances.table.hours}
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-semibold tracking-wider text-right">
                    {dict.finances.table.rate}
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-semibold tracking-wider text-right">
                    {dict.finances.table.amount}
                  </TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-semibold tracking-wider text-right">
                    {dict.finances.table.status}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((payment) => {
                  const initials = getInitials(payment.worker_name_snapshot);
                  
                  // Helper function to safely extract worker_details (same pattern as ShiftDetailsClient)
                  const getWorkerDetails = (profile: any) => {
                    if (!profile?.worker_details) return null;
                    if (Array.isArray(profile.worker_details)) {
                      return profile.worker_details[0] || null;
                    }
                    return profile.worker_details;
                  };
                  
                  const workerDetails = payment.profiles ? getWorkerDetails(payment.profiles) : null;
                  const avatarUrl = workerDetails?.avatar_url || null;
                  const correctionLabel = formatCorrectionNote(payment.metadata?.correction_note, payment.hours_worked);

                  return (
                    <TableRow 
                      key={payment.id} 
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="text-muted-foreground">
                        {formatDate(payment.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={avatarUrl || undefined} alt={payment.worker_name_snapshot} />
                            <AvatarFallback className="text-sm">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{payment.worker_name_snapshot}</p>
                            <p className="text-xs text-muted-foreground">
                              {payment.shift_title_snapshot}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-gray-900">{Number(payment.hours_worked).toFixed(2)}h</span>
                          {correctionLabel && (
                            <span className="text-[9px] uppercase tracking-wider text-orange-500 font-bold bg-orange-50 px-1 rounded-sm w-fit mt-0.5">
                              {correctionLabel}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatCurrency(payment.hourly_rate, payment.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-bold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={
                              payment.payment_status === 'paid'
                                ? 'default'
                                : payment.payment_status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className={
                              payment.payment_status === 'paid'
                                ? 'bg-green-500 hover:bg-green-600'
                                : payment.payment_status === 'pending'
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : ''
                            }
                          >
                            {payment.payment_status === 'pending'
                              ? dict.finances.status.pending
                              : payment.payment_status === 'paid'
                              ? dict.finances.status.paid
                              : dict.finances.status.cancelled}
                          </Badge>
                          <CorrectionBadge metadata={payment.metadata} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
