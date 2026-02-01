'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { formatDateShort, formatTime } from '@/lib/date-utils';
import { createClient } from '@/utils/supabase/client';
import { approveTimesheet } from '@/app/actions/timesheets';
import { Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import TimesheetRatingModal, { PendingTimesheetAction } from '@/components/timesheets/TimesheetRatingModal';

interface Timesheet {
  id: string;
  status: 'pending' | 'approved' | 'disputed' | 'paid' | 'rejected';
  worker_id: string;
  manager_approved_start: string | null;
  manager_approved_end: string | null;
  was_disputed?: boolean;
  total_pay: number | null;
  rejection_reason?: string | null;
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
      ratingModal?: {
        title: string;
        commentPlaceholder: string;
        save: string;
        skip: string;
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  // Track all IDs currently being processed to prevent double-clicks
  const processingIdsRef = useRef<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputingTimesheetId, setDisputingTimesheetId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [correctDialogOpen, setCorrectDialogOpen] = useState(false);
  const [correctingTimesheet, setCorrectingTimesheet] = useState<Timesheet | null>(null);
  const [extraMinutes, setExtraMinutes] = useState(0); // Extra time to add (starts at 0)
  // Rating Modal Interceptor
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingModalTimesheet, setRatingModalTimesheet] = useState<Timesheet | null>(null);
  const [pendingRatingAction, setPendingRatingAction] = useState<PendingTimesheetAction | null>(null);

  // Filter to show only pending and disputed timesheets (approved ones are in Payments/Billing)
  const filteredTimesheets = timesheets.filter(
    (timesheet) => 
      timesheet.status === 'pending' || 
      timesheet.status === 'disputed'
  );

  const handleApprove = useCallback(async (timesheetId: string) => {
    // Immediate check using ref to prevent double-clicks (synchronous)
    if (processingIdsRef.current.has(timesheetId)) {
      return; // Already processing this timesheet
    }
    
    // Mark as processing immediately (before any async operation)
    processingIdsRef.current.add(timesheetId);
    
    setIsUpdating(true);
    setProcessingId(timesheetId);
    setError(null);

    startTransition(async () => {
      try {
        const result = await approveTimesheet(timesheetId, lang);

        if (!result.success) {
          setError(result.error || 'Failed to approve timesheet');
        } else {
          // Refresh to get fresh data from server (single source of truth)
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        // Always clean up processing state
        processingIdsRef.current.delete(timesheetId);
        setProcessingId(null);
        setIsUpdating(false);
      }
    });
  }, [router, startTransition, lang]);

  const handleDisputeClick = (timesheet: Timesheet) => {
    if (!timesheet.worker_id) {
      setError('Cannot rate: worker not found for this timesheet.');
      return;
    }
    setRatingModalTimesheet(timesheet);
    setPendingRatingAction('dispute');
    setRatingModalOpen(true);
  };

  const handleDisputeClickDirect = (timesheetId: string) => {
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

    setIsUpdating(true);
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
          setIsUpdating(false);
        } else {
          setProcessingId(null);
          setIsUpdating(false);
          setDisputeDialogOpen(false);
          setDisputingTimesheetId(null);
          setDisputeReason('');
          // Refresh the page to get updated data
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
        setProcessingId(null);
        setIsUpdating(false);
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

  const handleRatingModalSaveOrSkip = useCallback(async (action: PendingTimesheetAction, _didRate: boolean) => {
    const ts = ratingModalTimesheet;
    if (!ts) return;

    setRatingModalOpen(false);
    setRatingModalTimesheet(null);
    setPendingRatingAction(null);

    if (action === 'approve') {
      handleApprove(ts.id);
    } else if (action === 'dispute') {
      handleDisputeClickDirect(ts.id);
    } else if (action === 'add_overtime') {
      handleOpenCorrectDialogInternal(ts);
    }
  }, [ratingModalTimesheet, handleApprove]);

  const handleApproveClick = (timesheet: Timesheet) => {
    // reviewee_id must come from shift_applications.worker_id - timesheet.worker_id is valid
    // only when accepted application exists (enforced by page filter)
    if (!timesheet.worker_id) {
      setError('Cannot rate: worker not found for this timesheet.');
      return;
    }
    setRatingModalTimesheet(timesheet);
    setPendingRatingAction('approve');
    setRatingModalOpen(true);
  };

  const handleOpenCorrectDialogInternal = (timesheet: Timesheet) => {
    const startTime = timesheet.manager_approved_start || timesheet.shifts.start_time;
    const endTime = timesheet.manager_approved_end || timesheet.shifts.end_time;

    if (!startTime || !endTime) {
      setError('Cannot correct hours: missing start or end time for this timesheet.');
      return;
    }

    setExtraMinutes(0);
    setCorrectingTimesheet(timesheet);
    setCorrectDialogOpen(true);
  };

  const handleOpenCorrectDialog = (timesheet: Timesheet) => {
    if (!timesheet.worker_id) {
      setError('Cannot rate: worker not found for this timesheet.');
      return;
    }
    setRatingModalTimesheet(timesheet);
    setPendingRatingAction('add_overtime');
    setRatingModalOpen(true);
  };

  const handleDurationHoursChange = (value: string) => {
    const parsedHours = parseInt(value || '0', 10);
    const safeHours = Number.isFinite(parsedHours) && parsedHours >= 0 ? parsedHours : 0;
    const minutesPart = extraMinutes % 60;
    setExtraMinutes(safeHours * 60 + minutesPart);
  };

  const handleDurationMinutesChange = (value: string) => {
    let parsedMinutes = parseInt(value || '0', 10);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0) {
      parsedMinutes = 0;
    }
    if (parsedMinutes > 59) {
      parsedMinutes = 59;
    }
    const hoursPart = Math.floor(extraMinutes / 60);
    setExtraMinutes(hoursPart * 60 + parsedMinutes);
  };

  const adjustDuration = (deltaMinutes: number) => {
    setExtraMinutes((prev) => Math.max(0, prev + deltaMinutes));
  };

  const handleSaveCorrection = async () => {
    if (!correctingTimesheet) return;

    // Calculate the new total duration: original duration + extra minutes
    const startTime = correctingTimesheet.manager_approved_start || correctingTimesheet.shifts.start_time;
    const endTime = correctingTimesheet.manager_approved_end || correctingTimesheet.shifts.end_time;

    if (!startTime || !endTime) {
      setError('Cannot calculate duration: missing start or end time.');
      return;
    }

    const originalDurationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    const originalMinutes = Math.max(0, Math.round(originalDurationMs / (1000 * 60)));
    const totalMinutes = originalMinutes + extraMinutes;
    const decimalHours = totalMinutes / 60;

    if (!Number.isFinite(decimalHours) || decimalHours <= 0) {
      setError('Please enter a valid positive duration.');
      return;
    }

    setIsUpdating(true);
    setProcessingId(correctingTimesheet.id);
    setError(null);

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data, error: rpcError } = await supabase.rpc(
          'correct_timesheet_hours',
          {
            p_timesheet_id: correctingTimesheet.id,
            p_new_hours: decimalHours,
          } as any
        );

        if (rpcError) {
          setError(rpcError.message || 'Failed to correct timesheet hours');
          setProcessingId(null);
          setIsUpdating(false);
          return;
        }

        // Close the modal as soon as the update succeeds
        setCorrectDialogOpen(false);
        setCorrectingTimesheet(null);
        setProcessingId(null);
        setIsUpdating(false);

        // Refresh the page to get updated data
        router.refresh();

        // If a global toast system is introduced later, a minimal
        // "Timesheet updated." message can be triggered here.
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred while correcting hours');
        setProcessingId(null);
        setIsUpdating(false);
      }
    });
  };

  // Calculate display values for the correction dialog
  const correctingStartTime =
    correctingTimesheet?.manager_approved_start || correctingTimesheet?.shifts.start_time || null;
  const correctingEndTime =
    correctingTimesheet?.manager_approved_end || correctingTimesheet?.shifts.end_time || null;
  
  // Calculate original duration in minutes (needed for save validation)
  const originalDurationMinutes = correctingStartTime && correctingEndTime
    ? Math.max(0, Math.round((new Date(correctingEndTime).getTime() - new Date(correctingStartTime).getTime()) / (1000 * 60)))
    : 0;
  
  // Total duration = original + extra (for validation)
  const totalDurationMinutes = originalDurationMinutes + extraMinutes;
  
  // Extra time for display (shown in big text and inputs)
  const extraHours = Math.floor(extraMinutes / 60);
  const extraMinutesOnly = extraMinutes % 60;

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
        <Card className="border-black">
          <CardContent className="py-4">
            <p className="text-sm text-black">{error}</p>
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
                  <TableRow key={timesheet.id} className={isDisputed ? 'bg-gray-100' : ''}>
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
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{hours} {dict.timesheetsPage.hours}</span>
                        {timesheet.was_disputed && timesheet.rejection_reason && (
                          <div className="text-[9px] uppercase tracking-tighter text-gray-600 font-bold leading-none mt-1">
                            MODIFIED: {timesheet.rejection_reason.replace('Correction: ', '')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {totalPay.toFixed(2)} DKK
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isDisputed && (
                          <span className="text-sm text-gray-600 font-medium mr-2">
                            Disputed
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleApproveClick(timesheet)}
                          disabled={isUpdating || timesheet.status !== 'pending'}
                          className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-white transition-colors bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                              {dict.timesheetsPage.processing}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              {dict.timesheetsPage.actions.approve}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDisputeClick(timesheet)}
                          disabled={isUpdating || timesheet.status !== 'pending'}
                          className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-white transition-colors bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500"
                        >
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          {dict.timesheetsPage.actions.dispute}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCorrectDialog(timesheet)}
                          disabled={isUpdating || timesheet.status !== 'pending'}
                          className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-white transition-colors bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-yellow-500"
                        >
                          <Clock className="h-4 w-4 shrink-0" />
                          Add Overtime
                        </button>
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

      {/* Correct Hours Dialog */}
      <Dialog
        key={correctingTimesheet?.id || 'closed'} // Force re-mount on each open
        open={correctDialogOpen}
        onOpenChange={(open) => {
          setCorrectDialogOpen(open);
          if (!open) {
            setCorrectingTimesheet(null);
            setExtraMinutes(0); // Reset to 0 when closing
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct Worked Hours</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* A. Header context line */}
            {correctingTimesheet && correctingStartTime && correctingEndTime && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>📅 {formatDateShort(correctingStartTime)}</span>
                <span className="text-muted-foreground">•</span>
                <span>⏰ {formatTime(correctingStartTime)} - {formatTime(correctingEndTime)}</span>
              </div>
            )}

            {/* B. Hero duration display - shows EXTRA TIME ONLY */}
            <div className="text-5xl font-bold text-center py-4">
              {`${Number.isFinite(extraHours) ? extraHours : 0}h ${Number.isFinite(
                extraMinutesOnly
              ) ? extraMinutesOnly : 0}m`}
            </div>

            {/* C. Controls - inputs represent EXTRA time to add */}
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Extra Time to Add</span>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Input
                      key={`hours-${correctingTimesheet?.id || 'none'}`}
                      type="number"
                      min={0}
                      value={Number.isFinite(extraHours) ? extraHours : 0}
                      onChange={(e) => handleDurationHoursChange(e.target.value)}
                      className="w-20 text-center"
                    />
                    <span>hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      key={`minutes-${correctingTimesheet?.id || 'none'}`}
                      type="number"
                      min={0}
                      max={59}
                      value={Number.isFinite(extraMinutesOnly) ? extraMinutesOnly : 0}
                      onChange={(e) => handleDurationMinutesChange(e.target.value)}
                      className="w-20 text-center"
                    />
                    <span>minutes</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustDuration(15)}
                  disabled={!correctDialogOpen}
                  className="rounded-full px-4"
                >
                  +15m
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustDuration(30)}
                  disabled={!correctDialogOpen}
                  className="rounded-full px-4"
                >
                  +30m
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCorrectDialogOpen(false);
                setCorrectingTimesheet(null);
                setExtraMinutes(0); // Reset to 0 when canceling
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCorrection}
              disabled={isPending || totalDurationMinutes <= 0 || !correctingTimesheet}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Correction'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Modal Interceptor */}
      {ratingModalTimesheet && pendingRatingAction && (
        <TimesheetRatingModal
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          workerId={ratingModalTimesheet.worker_id}
          shiftId={ratingModalTimesheet.shifts.id}
          workerName={`${ratingModalTimesheet.profiles?.first_name || ''} ${ratingModalTimesheet.profiles?.last_name || ''}`.trim() || 'Worker'}
          lang={lang}
          dict={dict.timesheetsPage.ratingModal || {
            title: 'Rate your collaboration with this worker',
            commentPlaceholder: 'Add an optional comment...',
            save: 'Save',
            skip: 'Skip',
          }}
          pendingAction={pendingRatingAction}
          onSaveOrSkip={handleRatingModalSaveOrSkip}
        />
      )}
    </div>
  );
}

