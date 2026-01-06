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
import { updateTimesheetStatus } from '@/app/actions/timesheets';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Timesheet {
  id: string;
  status: 'pending' | 'approved' | 'disputed' | 'paid' | 'rejected';
  worker_id: string;
  manager_approved_start: string | null;
  manager_approved_end: string | null;
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
    worker_details: {
      avatar_url: string | null;
    }[] | null;
  };
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
      actions: string;
      hours: string;
      processing: string;
      approveAndGenerate: string;
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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingTimesheetId, setRejectingTimesheetId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filter to show only pending timesheets
  const pendingTimesheets = timesheets.filter(
    (timesheet) => timesheet.status === 'pending'
  );

  const handleApprove = async (timesheetId: string) => {
    setProcessingId(timesheetId);
    setError(null);

    startTransition(async () => {
      const result = await updateTimesheetStatus({
        timesheetId,
        status: 'approved',
        lang,
      });

      if (result.error) {
        setError(result.error);
        setProcessingId(null);
      } else {
        // Refresh the page to get updated data
        router.refresh();
      }
    });
  };

  const handleRejectClick = (timesheetId: string) => {
    setRejectingTimesheetId(timesheetId);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectingTimesheetId) return;

    setProcessingId(rejectingTimesheetId);
    setError(null);

    startTransition(async () => {
      const result = await updateTimesheetStatus({
        timesheetId: rejectingTimesheetId,
        status: 'rejected',
        lang,
        rejectionReason: rejectionReason.trim() || null,
      });

      if (result.error) {
        setError(result.error);
        setProcessingId(null);
      } else {
        setRejectDialogOpen(false);
        setRejectingTimesheetId(null);
        setRejectionReason('');
        // Refresh the page to get updated data
        router.refresh();
      }
    });
  };

  const calculateHours = (timesheet: Timesheet): number => {
    const startTime = timesheet.manager_approved_start || timesheet.shifts.start_time;
    const endTime = timesheet.manager_approved_end || timesheet.shifts.end_time;
    if (!startTime || !endTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
    return parseFloat(hours.toFixed(2));
  };

  const calculateTotal = (hours: number, rate: number): number => {
    return parseFloat((hours * rate).toFixed(2));
  };

  if (pendingTimesheets.length === 0) {
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
              {pendingTimesheets.map((timesheet) => {
                const hours = calculateHours(timesheet);
                const total = calculateTotal(hours, timesheet.shifts.hourly_rate);
                const firstName = timesheet.profiles.first_name || '';
                const lastName = timesheet.profiles.last_name || '';
                const workerName = `${firstName} ${lastName}`.trim() || 'Unknown';
                const avatarUrl = timesheet.profiles.worker_details?.avatar_url || null;
                const initials = `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase() || '??';
                const isProcessing = isPending && processingId === timesheet.id;

                return (
                  <TableRow key={timesheet.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={avatarUrl || undefined} alt={workerName} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{workerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {timesheet.profiles.email}
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
                      {total.toFixed(2)} DKK
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleRejectClick(timesheet.id)}
                          disabled={isProcessing}
                          size="sm"
                          variant="destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
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

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this timesheet. This will help the worker understand why their timesheet was not approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason for rejection</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason('');
                setRejectingTimesheetId(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRejection}
              disabled={isPending}
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

