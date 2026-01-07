'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatDateShort, formatTime } from '@/lib/date-utils';
import { createClient } from '@/utils/supabase/client';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Timesheet {
  id: string;
  status: 'pending' | 'approved' | 'disputed' | 'paid' | 'rejected';
  worker_id: string;
  manager_approved_start: string | null;
  manager_approved_end: string | null;
  total_pay: number | null;
  shifts: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
  };
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  worker_details: {
    avatar_url: string | null;
  } | null;
}

interface TimesheetsClientProps {
  timesheets: Timesheet[];
  dict: {
    timesheetsPage: {
      noPendingApprovals: string;
      pendingApprovals: string;
      workerName: string;
      shiftTitle: string;
      date: string;
      hoursWorked: string;
      totalDue: string;
      hours: string;
      processing: string;
      approveAndGenerate: string;
      table: {
        actions: string;
      };
      actions: {
        approve: string;
        dispute: string;
      };
    };
  };
  lang: string;
}

export default function TimesheetsClient({
  timesheets,
  dict,
  lang,
}: TimesheetsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputingTimesheetId, setDisputingTimesheetId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  // Filter to show pending and disputed timesheets
  const filteredTimesheets = timesheets.filter(
    (timesheet) => timesheet.status === 'pending' || timesheet.status === 'disputed'
  );

  const handleApprove = async (timesheetId: string) => {
    setProcessingId(timesheetId);
    setError(null);

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: rpcError } = await supabase.rpc('approve_timesheet', {
          timesheet_id_input: timesheetId,
        } as any);

        if (rpcError) {
          setError(rpcError.message || 'Failed to approve timesheet');
          setProcessingId(null);
        } else {
          // Refresh the page to get updated data
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
        setProcessingId(null);
      }
    });
  };

  const handleDisputeClick = (timesheetId: string) => {
    setDisputingTimesheetId(timesheetId);
    setDisputeReason('');
    setDisputeDialogOpen(true);
  };

  const handleConfirmDispute = async () => {
    if (!disputingTimesheetId) return;

    if (!disputeReason.trim()) {
      setError('Please provide a reason for disputing this timesheet');
      return;
    }

    setProcessingId(disputingTimesheetId);
    setError(null);

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: rpcError } = await supabase.rpc('dispute_timesheet', {
          timesheet_id_input: disputingTimesheetId,
          reason_input: disputeReason.trim(),
        } as any);

        if (rpcError) {
          setError(rpcError.message || 'Failed to dispute timesheet');
          setProcessingId(null);
        } else {
          setDisputeDialogOpen(false);
          setDisputingTimesheetId(null);
          setDisputeReason('');
          // Refresh the page to get updated data
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
        setProcessingId(null);
      }
    });
  };

  const calculateHours = (timesheet: Timesheet): number => {
    // Calculate hours for display purposes only
    const startTime = timesheet.manager_approved_start || timesheet.shifts.start_time;
    const endTime = timesheet.manager_approved_end || timesheet.shifts.end_time;
    if (!startTime || !endTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
    return parseFloat(hours.toFixed(2));
  };

  if (filteredTimesheets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{dict.timesheetsPage.noPendingApprovals}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{dict.timesheetsPage.pendingApprovals}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.timesheetsPage.workerName}</TableHead>
                <TableHead>{dict.timesheetsPage.shiftTitle}</TableHead>
                <TableHead>{dict.timesheetsPage.date}</TableHead>
                <TableHead>{dict.timesheetsPage.hoursWorked}</TableHead>
                <TableHead>{dict.timesheetsPage.totalDue}</TableHead>
                <TableHead className="text-right">{dict.timesheetsPage.table.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimesheets.map((timesheet) => {
                const hours = calculateHours(timesheet);
                // Use total_pay from database (single source of truth)
                const totalPay = timesheet.total_pay || 0;
                const firstName = timesheet.profiles?.first_name || '';
                const lastName = timesheet.profiles?.last_name || '';
                const workerName = `${firstName} ${lastName}`.trim() || 'Unknown';
                const avatarUrl = timesheet.worker_details?.avatar_url || null;
                const initials = `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase() || '??';
                const isProcessing = isPending && processingId === timesheet.id;
                const isDisputed = timesheet.status === 'disputed';

                return (
                  <TableRow key={timesheet.id} className={isDisputed ? 'bg-yellow-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={avatarUrl || undefined} alt={workerName} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{workerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {timesheet.profiles?.email || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{timesheet.shifts.title}</TableCell>
                    <TableCell>
                      {formatDateShort(timesheet.shifts.start_time)}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        {formatTime(timesheet.shifts.start_time)} - {formatTime(timesheet.shifts.end_time)}
                      </span>
                    </TableCell>
                    <TableCell>{hours} {dict.timesheetsPage.hours}</TableCell>
                    <TableCell className="font-medium">
                      {totalPay.toFixed(2)} DKK
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isDisputed && (
                          <span className="text-sm text-yellow-600 font-medium mr-2">
                            Disputed
                          </span>
                        )}
                        <Button
                          onClick={() => handleApprove(timesheet.id)}
                          disabled={isProcessing}
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {dict.timesheetsPage.processing}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {dict.timesheetsPage.actions.approve}
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleDisputeClick(timesheet.id)}
                          disabled={isProcessing}
                          size="sm"
                          variant="destructive"
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          {dict.timesheetsPage.actions.dispute}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Timesheet</DialogTitle>
            <DialogDescription>
              Please provide a reason for disputing this timesheet. This will help resolve any discrepancies with the recorded hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dispute-reason">Reason for dispute</Label>
              <Textarea
                id="dispute-reason"
                placeholder="Enter the reason for disputing this timesheet..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDisputeDialogOpen(false);
                setDisputeReason('');
                setDisputingTimesheetId(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDispute}
              disabled={isPending || !disputeReason.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

